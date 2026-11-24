import 'dart:async';

import 'package:agora_rtc_engine/agora_rtc_engine.dart';
import 'package:flutter/material.dart';
import 'package:permission_handler/permission_handler.dart';

import '../core/api.dart';
import '../core/i18n.dart';
import '../core/models.dart';
import '../widgets/common.dart';

/// Ringing screen for a call someone started with me.
class IncomingCallScreen extends StatefulWidget {
  const IncomingCallScreen({super.key, required this.call});
  final CallInfo call;
  @override
  State<IncomingCallScreen> createState() => _IncomingCallScreenState();
}

class _IncomingCallScreenState extends State<IncomingCallScreen> {
  late final Stream<CallInfo?> _doc = Api.callDoc(widget.call.id);
  StreamSubscription<CallInfo?>? _sub;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _sub = _doc.listen((c) {
      if (!mounted || _busy) return;
      if (c == null || c.status != 'ringing') Navigator.of(context).maybePop();
    });
  }

  @override
  void dispose() {
    _sub?.cancel();
    super.dispose();
  }

  Future<void> _answer(bool accept) async {
    setState(() => _busy = true);
    try {
      final r = await Api.call('answerCall', {'callId': widget.call.id, 'accept': accept});
      if (!mounted) return;
      if (!accept) return Navigator.of(context).pop();
      final other = await Api.profileOnce(widget.call.from);
      if (!mounted) return;
      Navigator.of(context).pushReplacement(MaterialPageRoute(
        builder: (_) => CallScreen(
          callId: widget.call.id, channel: r['channel'] as String, token: r['token'] as String, appId: r['appId'] as String,
          uid: (r['uid'] as num).toInt(), video: widget.call.video, other: other, outgoing: false,
        ),
      ));
    } catch (e) {
      if (mounted) {
        showError(context, e);
        Navigator.of(context).pop();
      }
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        backgroundColor: kNavy,
        body: SafeArea(
          child: FutureBuilder<Profile>(
            future: Api.profileOnce(widget.call.from),
            builder: (context, s) {
              final p = s.data ?? Profile(widget.call.from, const {});
              return Column(children: [
                const Spacer(),
                ProfileAvatar(p, size: 120),
                const SizedBox(height: 16),
                Text(p.name, style: const TextStyle(color: Colors.white, fontSize: 30, fontWeight: FontWeight.w700)),
                Text(context.t(widget.call.video ? 'incoming_video' : 'incoming_voice'), style: const TextStyle(color: Colors.white70)),
                const Spacer(),
                Row(mainAxisAlignment: MainAxisAlignment.spaceEvenly, children: [
                  _RoundButton(color: kRed, icon: Icons.call_end, label: context.t('decline'), onTap: _busy ? null : () => _answer(false)),
                  _RoundButton(color: const Color(0xFF16A34A), icon: widget.call.video ? Icons.videocam : Icons.call, label: context.t('accept'), onTap: _busy ? null : () => _answer(true)),
                ]),
                const SizedBox(height: 48),
              ]);
            },
          ),
        ),
      );
}

/// Active voice or video call through Agora.
class CallScreen extends StatefulWidget {
  const CallScreen({
    super.key, required this.callId, required this.channel, required this.token, required this.appId,
    required this.uid, required this.video, required this.other, required this.outgoing,
  });
  final String callId;
  final String channel;
  final String token;
  final String appId;
  final int uid;
  final bool video;
  final Profile other;
  final bool outgoing;

  @override
  State<CallScreen> createState() => _CallScreenState();
}

class _CallScreenState extends State<CallScreen> {
  RtcEngine? _engine;
  int? _remote;
  bool _muted = false;
  bool _speaker = false;
  bool _camOff = false;
  bool _ended = false;
  int _seconds = 0;
  Timer? _timer;
  Timer? _ringTimeout;
  StreamSubscription<CallInfo?>? _sub;

  @override
  void initState() {
    super.initState();
    _speaker = widget.video;
    _start();
    _sub = Api.callDoc(widget.callId).listen((c) {
      if (c == null || ['declined', 'missed', 'ended', 'failed'].contains(c.status)) _hangUp(remote: true);
    });
    if (widget.outgoing) {
      _ringTimeout = Timer(const Duration(seconds: 45), () {
        if (_remote == null) _hangUp();
      });
    }
  }

  /// Shows what went wrong (with Agora's code, so it can be reported) and ends the call.
  void _fail(Object code) {
    if (_ended || !mounted) return;
    showInfo(context, context.t('call_error', {'code': '$code'}));
    _hangUp();
  }

  Future<void> _start() async {
    try {
      await _join();
    } catch (err) {
      debugPrint('call start failed: $err');
      _fail(err is AgoraRtcException ? err.code : 'start');
    }
  }

  Future<void> _join() async {
    final perms = [Permission.microphone, if (widget.video) Permission.camera];
    final res = await perms.request();
    if (res.values.any((s) => !s.isGranted)) {
      if (mounted) showInfo(context, context.t('call_permission'));
      return _hangUp();
    }
    final e = createAgoraRtcEngine();
    _engine = e;
    await e.initialize(RtcEngineContext(appId: widget.appId, channelProfile: ChannelProfileType.channelProfileCommunication));
    e.registerEventHandler(RtcEngineEventHandler(
      onUserJoined: (RtcConnection c, int remoteUid, int elapsed) {
        _ringTimeout?.cancel();
        if (!mounted) return;
        setState(() => _remote = remoteUid);
        _timer ??= Timer.periodic(const Duration(seconds: 1), (_) {
          if (mounted) setState(() => _seconds++);
        });
      },
      onUserOffline: (RtcConnection c, int remoteUid, UserOfflineReasonType r) => _hangUp(remote: true),
      onError: (ErrorCodeType err, String msg) {
        debugPrint('agora $err $msg');
        const fatal = {
          ErrorCodeType.errInvalidAppId, ErrorCodeType.errInvalidChannelName, ErrorCodeType.errInvalidToken,
          ErrorCodeType.errTokenExpired, ErrorCodeType.errJoinChannelRejected, ErrorCodeType.errNotInitialized,
        };
        if (fatal.contains(err)) _fail(err.value());
      },
      onConnectionStateChanged: (RtcConnection c, ConnectionStateType state, ConnectionChangedReasonType reason) {
        debugPrint('agora connection $state $reason');
        if (state == ConnectionStateType.connectionStateFailed) _fail('c${reason.value()}');
      },
      onLocalVideoStateChanged: (VideoSourceType source, LocalVideoStreamState state, LocalVideoStreamReason reason) {
        if (state == LocalVideoStreamState.localVideoStreamStateFailed) {
          debugPrint('agora camera $reason');
          if (mounted) showInfo(context, context.t('call_error', {'code': 'v${reason.value()}'}));
        }
      },
    ));
    if (widget.video) {
      await e.enableVideo();
      await e.startPreview();
    }
    await e.setDefaultAudioRouteToSpeakerphone(_speaker);
    await e.joinChannel(
      token: widget.token,
      channelId: widget.channel,
      uid: widget.uid,
      options: ChannelMediaOptions(
        clientRoleType: ClientRoleType.clientRoleBroadcaster,
        publishMicrophoneTrack: true,
        publishCameraTrack: widget.video,
        autoSubscribeAudio: true,
        autoSubscribeVideo: widget.video,
      ),
    );
    if (mounted) setState(() {});
  }

  Future<void> _hangUp({bool remote = false}) async {
    if (_ended) return;
    // Mark the call ended in the widget state first, so the back gesture and the pop below are allowed.
    if (mounted) {
      setState(() => _ended = true);
    } else {
      _ended = true;
    }
    _timer?.cancel();
    _ringTimeout?.cancel();
    if (!remote) Api.call('endCall', {'callId': widget.callId}).ignore();
    final e = _engine;
    _engine = null;
    // Leave the screen right away; never wait on the call engine to do it.
    if (mounted && Navigator.of(context).canPop()) Navigator.of(context).pop();
    if (e != null) {
      try {
        await e.leaveChannel();
      } catch (_) {}
      try {
        await e.release();
      } catch (_) {}
    }
  }


  @override
  void dispose() {
    _sub?.cancel();
    _timer?.cancel();
    _ringTimeout?.cancel();
    if (!_ended) {
      _ended = true;
      Api.call('endCall', {'callId': widget.callId}).ignore();
      final e = _engine;
      if (e != null) e.leaveChannel().catchError((_) {}).whenComplete(() => e.release().catchError((_) {}));
    }
    super.dispose();
  }

  String get _clock => '${(_seconds ~/ 60).toString().padLeft(2, '0')}:${(_seconds % 60).toString().padLeft(2, '0')}';

  @override
  Widget build(BuildContext context) {
    final e = _engine;
    return PopScope(
      canPop: _ended,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) _hangUp();
      },
      child: Scaffold(
        backgroundColor: const Color(0xFF08132E),
        body: Stack(children: [
          if (widget.video && e != null && _remote != null)
            Positioned.fill(
              child: AgoraVideoView(
                controller: VideoViewController.remote(rtcEngine: e, canvas: VideoCanvas(uid: _remote), connection: RtcConnection(channelId: widget.channel)),
              ),
            )
          else
            Positioned.fill(
              child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                ProfileAvatar(widget.other, size: 120),
                const SizedBox(height: 16),
                Text(widget.other.name, style: const TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.w700)),
                const SizedBox(height: 6),
                Text(_remote == null ? context.t('calling') : _clock, style: const TextStyle(color: Colors.white70, fontSize: 16)),
              ]),
            ),
          if (widget.video && e != null && !_camOff)
            PositionedDirectional(
              top: MediaQuery.paddingOf(context).top + 16,
              end: 16,
              width: 110,
              height: 160,
              child: ClipRRect(
                borderRadius: BorderRadius.circular(14),
                child: AgoraVideoView(controller: VideoViewController(rtcEngine: e, canvas: const VideoCanvas(uid: 0))),
              ),
            ),
          if (widget.video && _remote != null)
            PositionedDirectional(
              top: MediaQuery.paddingOf(context).top + 16,
              start: 16,
              child: Text('${widget.other.name} · $_clock', style: const TextStyle(color: Colors.white, shadows: [Shadow(blurRadius: 6)])),
            ),
          Positioned(
            left: 0,
            right: 0,
            bottom: MediaQuery.paddingOf(context).bottom + 28,
            child: Row(mainAxisAlignment: MainAxisAlignment.spaceEvenly, children: [
              _RoundButton(
                color: _muted ? Colors.white : Colors.white24, iconColor: _muted ? Colors.black : Colors.white,
                icon: _muted ? Icons.mic_off : Icons.mic, label: context.t('mute'),
                onTap: () {
                  setState(() => _muted = !_muted);
                  _engine?.muteLocalAudioStream(_muted);
                },
              ),
              if (widget.video)
                _RoundButton(color: Colors.white24, icon: Icons.cameraswitch, label: context.t('flip'), onTap: () => _engine?.switchCamera())
              else
                _RoundButton(
                  color: _speaker ? Colors.white : Colors.white24, iconColor: _speaker ? Colors.black : Colors.white,
                  icon: Icons.volume_up, label: context.t('speaker'),
                  onTap: () {
                    setState(() => _speaker = !_speaker);
                    _engine?.setEnableSpeakerphone(_speaker);
                  },
                ),
              if (widget.video)
                _RoundButton(
                  color: _camOff ? Colors.white : Colors.white24, iconColor: _camOff ? Colors.black : Colors.white,
                  icon: _camOff ? Icons.videocam_off : Icons.videocam, label: context.t('camera'),
                  onTap: () {
                    setState(() => _camOff = !_camOff);
                    _engine?.muteLocalVideoStream(_camOff);
                  },
                ),
              _RoundButton(color: kRed, icon: Icons.call_end, label: context.t('end_call'), onTap: () => _hangUp()),
            ]),
          ),
        ]),
      ),
    );
  }
}

class _RoundButton extends StatelessWidget {
  const _RoundButton({required this.color, required this.icon, required this.label, required this.onTap, this.iconColor = Colors.white});
  final Color color;
  final Color iconColor;
  final IconData icon;
  final String label;
  final VoidCallback? onTap;
  @override
  Widget build(BuildContext context) => Column(mainAxisSize: MainAxisSize.min, children: [
        Material(
          color: color,
          shape: const CircleBorder(),
          child: InkWell(customBorder: const CircleBorder(), onTap: onTap, child: SizedBox(width: 68, height: 68, child: Icon(icon, color: iconColor, size: 30))),
        ),
        const SizedBox(height: 6),
        Text(label, style: const TextStyle(color: Colors.white70, fontSize: 12)),
      ]);
}
