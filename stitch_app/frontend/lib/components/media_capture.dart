import 'dart:async';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';
import 'package:record/record.dart';
import '../theme/app_theme.dart';

/// Video/audio recording widget with status indicators.
class MediaCapture extends StatefulWidget {
  final ValueChanged<String?>? onVideoSelected;
  final ValueChanged<String?>? onAudioRecorded;

  const MediaCapture({
    super.key,
    this.onVideoSelected,
    this.onAudioRecorded,
  });

  @override
  State<MediaCapture> createState() => _MediaCaptureState();
}

class _MediaCaptureState extends State<MediaCapture> {
  String? _videoFileName;
  String? _audioFileName;
  bool _isRecordingAudio = false;
  int _audioSeconds = 0;
  Timer? _audioTimer;
  final AudioRecorder _audioRecorder = AudioRecorder();

  @override
  void dispose() {
    _audioTimer?.cancel();
    _audioRecorder.dispose();
    super.dispose();
  }

  Future<void> _handleRecordVideo() async {
    final scaffold = ScaffoldMessenger.of(context);
    try {
      final picker = ImagePicker();
      const source = kIsWeb ? ImageSource.gallery : ImageSource.camera;
      final XFile? video = await picker.pickVideo(
        source: source,
        maxDuration: const Duration(seconds: 30),
      );
      if (video != null && mounted) {
        setState(() => _videoFileName = video.name);
        widget.onVideoSelected?.call(video.name);
        scaffold.showSnackBar(
          AppWidgets.successSnackBar('Video added: ${video.name}'),
        );
      }
    } catch (e) {
      if (!mounted) return;
      scaffold.showSnackBar(
        AppWidgets.errorSnackBar(
            'Could not access camera. Please grant permission.'),
      );
    }
  }

  Future<void> _handleAudioRecord() async {
    if (_isRecordingAudio) {
      final path = await _audioRecorder.stop();
      _audioTimer?.cancel();
      if (mounted) {
        final fileName = path?.split('/').last.split('\\').last;
        setState(() {
          _isRecordingAudio = false;
          if (path != null) _audioFileName = fileName;
        });
        widget.onAudioRecorded?.call(fileName);
        if (path != null) {
          ScaffoldMessenger.of(context).showSnackBar(
            AppWidgets.successSnackBar('Audio recorded: ${_audioSeconds}s'),
          );
        }
      }
    } else {
      final hasPermission = await _audioRecorder.hasPermission();
      if (!hasPermission) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            AppWidgets.errorSnackBar(
                'Microphone permission is required to record audio.'),
          );
        }
        return;
      }
      const config = RecordConfig(
        encoder: kIsWeb ? AudioEncoder.opus : AudioEncoder.aacLc,
        sampleRate: 44100,
        bitRate: 128000,
      );
      await _audioRecorder.start(config, path: '');
      setState(() {
        _isRecordingAudio = true;
        _audioSeconds = 0;
      });
      _audioTimer = Timer.periodic(const Duration(seconds: 1), (_) {
        if (mounted) {
          setState(() => _audioSeconds++);
          if (_audioSeconds >= 60) _handleAudioRecord();
        }
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(child: _buildVideoCard()),
        const SizedBox(width: 12),
        Expanded(child: _buildAudioCard()),
      ],
    );
  }

  Widget _buildVideoCard() {
    final hasVideo = _videoFileName != null;
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: _handleRecordVideo,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: hasVideo
              ? AppColors.primary.withValues(alpha: 0.05)
              : AppColors.surface,
          borderRadius: BorderRadius.circular(AppRadius.lg),
          border: Border.all(
            color: hasVideo ? AppColors.primary : AppColors.border,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 42,
              height: 42,
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(AppRadius.md),
              ),
              child: Icon(
                hasVideo ? Icons.check_circle : Icons.videocam_outlined,
                color: AppColors.primary,
                size: 22,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              hasVideo ? 'Video Ready' : 'Record Video',
              style: GoogleFonts.plusJakartaSans(
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              hasVideo ? 'Tap to re-record' : 'Up to 30 seconds',
              style: GoogleFonts.dmSans(
                fontSize: 11,
                color: AppColors.textSecondary,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAudioCard() {
    final hasAudio = _audioFileName != null;
    final isRecording = _isRecordingAudio;

    Color borderColor = AppColors.border;
    Color bgColor = AppColors.surface;
    Color iconAccent = const Color(0xFF8B5CF6);

    if (isRecording) {
      borderColor = AppColors.error;
      bgColor = AppColors.error.withValues(alpha: 0.05);
      iconAccent = AppColors.error;
    } else if (hasAudio) {
      borderColor = const Color(0xFF8B5CF6);
      bgColor = const Color(0xFF8B5CF6).withValues(alpha: 0.05);
    }

    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: _handleAudioRecord,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: bgColor,
          borderRadius: BorderRadius.circular(AppRadius.lg),
          border: Border.all(color: borderColor),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 42,
              height: 42,
              decoration: BoxDecoration(
                color: iconAccent.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(AppRadius.md),
              ),
              child: Icon(
                isRecording
                    ? Icons.stop_circle
                    : hasAudio
                        ? Icons.check_circle
                        : Icons.mic_outlined,
                color: iconAccent,
                size: 22,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              isRecording
                  ? 'Recording ${_audioSeconds}s'
                  : hasAudio
                      ? 'Audio Ready'
                      : 'Record Audio',
              style: GoogleFonts.plusJakartaSans(
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: isRecording ? AppColors.error : AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              isRecording
                  ? 'Tap to stop'
                  : hasAudio
                      ? 'Tap to re-record'
                      : 'Up to 60 seconds',
              style: GoogleFonts.dmSans(
                fontSize: 11,
                color: AppColors.textSecondary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
