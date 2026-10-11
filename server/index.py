
import os
import shutil
import subprocess
import tempfile
from pathlib import Path
import logging

from fastapi import FastAPI, File, HTTPException, UploadFile
from starlette.background import BackgroundTask
from fastapi.responses import FileResponse
from faster_whisper import WhisperModel


logger = logging.getLogger("uvicorn.error")

app = FastAPI(title="Video Subtitle API")

MAX_FILE_SIZE = 500 * 1024 * 1024  # 500 MB
ALLOWED_EXTENSIONS = {".mp4", ".mov", ".mkv", ".webm"}

# Load the model once, not for every request.
MODEL_DIR = Path(__file__).resolve().parent / "models" / "small"

if not (MODEL_DIR / "model.bin").exists():
    raise RuntimeError(f"Whisper model not found in {MODEL_DIR}.")

print("Loading Whisper model...", flush=True)
model = WhisperModel(str(MODEL_DIR), device="cpu", compute_type="int8")
print("Whisper model loaded.", flush=True)


def format_timestamp(seconds: float) -> str:
    milliseconds = round(seconds * 1000)
    hours, milliseconds = divmod(milliseconds, 3_600_000)
    minutes, milliseconds = divmod(milliseconds, 60_000)
    secs, milliseconds = divmod(milliseconds, 1000)

    return (
        f"{hours:02}:{minutes:02}:{secs:02},"
        f"{milliseconds:03}"
    )


def generate_srt(segments, output_path: Path) -> None:
    with output_path.open("w", encoding="utf-8") as file:
        for index, segment in enumerate(segments, start=1):
            file.write(f"{index}\n")
            file.write(
                f"{format_timestamp(segment.start)} --> "
                f"{format_timestamp(segment.end)}\n"
            )
            file.write(segment.text.strip() + "\n\n")


def burn_subtitles(
    video_path: Path,
    subtitle_path: Path,
    output_path: Path,
) -> None:
    # Fixed filenames avoid filter-path escaping problems.
    command = [
        "ffmpeg",
        "-hide_banner",
        "-loglevel", "error",
        "-y",
        "-i", video_path.name,
        "-vf", "subtitles=subtitles.srt",
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "23",
        "-c:a", "aac",
        "-b:a", "128k",
        "-movflags", "+faststart",
        output_path.name,
    ]

    subprocess.run(
        command,
        cwd=str(video_path.parent),
        check=True,
        capture_output=True,
        text=True,
    )


@app.get("/")
def health_check():
    return {"status": "ok"}


@app.post("/api/process")
def process_video(file: UploadFile = File(...)):
    extension = Path(file.filename or "").suffix.lower()

    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Unsupported video format.",
        )

    work_dir = Path(tempfile.mkdtemp(prefix="subtitle_job_"))
    input_path = work_dir / f"input{extension}"
    subtitle_path = work_dir / "subtitles.srt"
    output_path = work_dir / "output.mp4"

    try:
        # Save in chunks and enforce the file size limit.
        total_size = 0

        with input_path.open("wb") as destination:
            while True:
                chunk = file.file.read(1024 * 1024)

                if not chunk:
                    break

                total_size += len(chunk)

                if total_size > MAX_FILE_SIZE:
                    raise HTTPException(
                        status_code=413,
                        detail="Maximum upload size is 500 MB.",
                    )

                destination.write(chunk)

        if total_size == 0:
            raise HTTPException(
                status_code=400,
                detail="The uploaded file is empty.",
            )

        # Transcribe the spoken audio.
        segments, info = model.transcribe(
            str(input_path),
            vad_filter=True,
        )

        # Consume the generator while writing timestamped subtitles.
        generate_srt(segments, subtitle_path)

        if subtitle_path.stat().st_size == 0:
            raise HTTPException(
                status_code=422,
                detail="No subtitles could be generated.",
            )

        # Permanently render the subtitles onto the video.
        burn_subtitles(
            input_path,
            subtitle_path,
            output_path,
        )

        return FileResponse(
            path=str(output_path),
            media_type="video/mp4",
            filename="subtitled_video.mp4",
            background=BackgroundTask(
                shutil.rmtree,
                str(work_dir),
                ignore_errors=True,
            ),
        )

    except HTTPException:
        shutil.rmtree(work_dir, ignore_errors=True)
        raise

    except FileNotFoundError:
        logger.exception("File not found while processing")
        shutil.rmtree(work_dir, ignore_errors=True)
        raise HTTPException(
            status_code=500,
            detail="FFmpeg was not found or a required file is missing.",
        )
    except subprocess.CalledProcessError as exc:
        logger.error("ffmpeg failed:\n%s", exc.stderr)
        shutil.rmtree(work_dir, ignore_errors=True)
        raise HTTPException(
            status_code=500,
            detail="Video rendering failed. Check your FFmpeg installation.",
        )

    except Exception:
        logger.exception("Video processing failed")
        shutil.rmtree(work_dir, ignore_errors=True)
        raise HTTPException(
            status_code=500,
            detail="Video processing failed.",
        )

    finally:
        file.file.close()
