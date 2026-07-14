import os
import uuid
from loguru import logger

FFMPEG_BIN = r"C:\ffmpeg\ffmpeg-master-latest-win64-gpl\bin"
os.environ["PATH"] = FFMPEG_BIN + os.pathsep + os.environ.get("PATH", "")

from pydub import AudioSegment

CHUNK_LENGTH_MS = 30 * 1000


def ensure_wav(input_path: str) -> str:
    if input_path.lower().endswith(".wav"):
        return input_path
    audio = AudioSegment.from_file(input_path)
    wav_path = input_path.rsplit(".", 1)[0] + ".wav"
    audio.export(wav_path, format="wav")
    logger.info(f"Converted to WAV: {wav_path}")
    return wav_path


def chunk_audio(wav_path: str, output_dir: str = "chunks") -> list:
    audio = AudioSegment.from_file(wav_path)
    total_length_ms = len(audio)

    if total_length_ms <= CHUNK_LENGTH_MS:
        return [{"path": wav_path, "start_offset": 0}]

    os.makedirs(output_dir, exist_ok=True)
    chunks = []
    num_chunks = (total_length_ms // CHUNK_LENGTH_MS) + 1

    for i in range(num_chunks):
        start_ms = i * CHUNK_LENGTH_MS
        end_ms = min(start_ms + CHUNK_LENGTH_MS, total_length_ms)
        if start_ms >= total_length_ms:
            break
        piece = audio[start_ms:end_ms]
        chunk_path = os.path.join(output_dir, f"chunk_{uuid.uuid4().hex[:8]}_{i}.wav")
        piece.export(chunk_path, format="wav")
        chunks.append({
            "path": chunk_path,
            "start_offset": start_ms / 1000
        })

    logger.info(f"Split audio into {len(chunks)} chunks")
    return chunks


def transcribe_chunk_groq(chunk_path: str, start_offset: float) -> list:
    from groq import Groq
    from app.core.config import settings

    client = Groq(api_key=settings.GROQ_API_KEY)

    with open(chunk_path, "rb") as audio_file:
        response = client.audio.transcriptions.create(
            model="whisper-large-v3",
            file=audio_file,
            response_format="verbose_json"
        )

    corrected = []
    if hasattr(response, 'segments') and response.segments:
        for seg in response.segments:
            if isinstance(seg, dict):
                corrected.append({
                    "start": round(seg.get("start", 0) + start_offset, 2),
                    "end": round(seg.get("end", 0) + start_offset, 2),
                    "text": seg.get("text", "").strip()
                })
            else:
                corrected.append({
                    "start": round(seg.start + start_offset, 2),
                    "end": round(seg.end + start_offset, 2),
                    "text": seg.text.strip()
                })
    else:
        corrected.append({
            "start": start_offset,
            "end": start_offset + 30,
            "text": response.text.strip() if response.text else ""
        })

    return corrected

def transcribe_audio(audio_path: str) -> dict:
    logger.info(f"Starting transcription: {audio_path}")

    wav_path = ensure_wav(audio_path)
    chunks = chunk_audio(wav_path)

    all_segments = []
    for i, chunk in enumerate(chunks):
        logger.info(f"Transcribing chunk {i+1}/{len(chunks)} via Groq Whisper")
        segments = transcribe_chunk_groq(chunk["path"], chunk["start_offset"])
        all_segments.extend(segments)

        if chunk["path"] != wav_path and os.path.exists(chunk["path"]):
            try:
                os.remove(chunk["path"])
            except Exception:
                pass

    if wav_path != audio_path and os.path.exists(wav_path):
        try:
            os.remove(wav_path)
        except Exception:
            pass

    full_text = " ".join(seg["text"] for seg in all_segments)
    logger.info(f"Transcription complete. {len(all_segments)} segments")

    return {
        "text": full_text,
        "segments": all_segments,
        "duration": all_segments[-1]["end"] if all_segments else 0,
        "chunk_count": len(chunks)
    }