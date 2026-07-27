#!/usr/bin/env python3
"""
Foto — Juggernaut XL offline image generator
Uses stable-diffusion-cpp-python bindings (v0.4.7)
"""

import sys
import argparse
import os
import traceback

def parse_args():
    parser = argparse.ArgumentParser(description='Generate image with Juggernaut XL')
    parser.add_argument('--model', required=True)
    parser.add_argument('--clip_l', required=True)
    parser.add_argument('--clip_g', required=True)
    parser.add_argument('--vae', required=True)
    parser.add_argument('--prompt', required=True)
    parser.add_argument('--negative_prompt', default='blurry, low quality, ugly, deformed')
    parser.add_argument('--steps', type=int, default=20)
    parser.add_argument('--cfg', type=float, default=7.0)
    parser.add_argument('--width', type=int, default=1024)
    parser.add_argument('--height', type=int, default=1024)
    parser.add_argument('--seed', type=int, default=-1)
    # Use the exact key strings from SAMPLE_METHOD_MAP in the library
    parser.add_argument('--sampler', default='dpm++2m')
    parser.add_argument('--threads', type=int, default=4)
    parser.add_argument('--output', required=True)
    return parser.parse_args()


def log(msg):
    print(f"[Foto] {msg}", file=sys.stderr, flush=True)


def main():
    args = parse_args()

    print("PROGRESS:0", flush=True)
    log("Starting Foto image generator...")
    log(f"Python {sys.version}")
    log(f"Model: {args.model}")
    log(f"Clip-L: {args.clip_l}")
    log(f"Clip-G: {args.clip_g}")
    log(f"VAE: {args.vae}")

    # Verify all files exist before trying to load
    for label, fpath in [("model", args.model), ("clip_l", args.clip_l),
                          ("clip_g", args.clip_g), ("vae", args.vae)]:
        if not os.path.exists(fpath):
            log(f"ERROR: {label} file not found: {fpath}")
            sys.exit(1)
        size_mb = os.path.getsize(fpath) / 1024 / 1024
        log(f"  {label}: {os.path.basename(fpath)} ({size_mb:.1f} MB) ✓")

    log("Importing stable_diffusion_cpp...")
    import platform
    is_m_series = False
    if sys.platform == 'darwin':
        try:
            import subprocess
            cpu_brand = subprocess.check_output(["sysctl", "-n", "machdep.cpu.brand_string"]).decode("utf-8")
            if "Apple" in cpu_brand:
                is_m_series = True
        except Exception:
            if platform.machine() == 'arm64' or platform.processor() == 'arm':
                is_m_series = True

        if not is_m_series:
            log("Intel Mac detected: Forcing CPU mode (Metal OFF) to prevent crashes.")
            os.environ["GGML_NO_METAL"] = "1"
            os.environ["GGML_METAL_NDISABLE"] = "1"
            os.environ["SD_NO_METAL"] = "1"
        else:
            log("Apple Silicon Mac detected: Enabling Metal GPU acceleration.")
            os.environ.pop("GGML_NO_METAL", None)
            os.environ.pop("GGML_METAL_NDISABLE", None)
            os.environ.pop("SD_NO_METAL", None)
    else:
        log(f"Running on platform: {sys.platform}")

    try:
        from stable_diffusion_cpp import StableDiffusion
        log("Import OK")
    except ImportError as e:
        log(f"ERROR: stable_diffusion_cpp not installed: {e}")
        sys.exit(1)
    except Exception as e:
        log(f"ERROR during import: {type(e).__name__}: {e}")
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)

    log(f"Loading model (this takes 30-60s on first load)...")
    log(f"Threads: {args.threads}, Size: {args.width}x{args.height}, Steps: {args.steps}, CFG: {args.cfg}")

    try:
        # Use CPU offloading for clip/vae only on Intel Macs to prevent driver crashes
        use_cpu_offload = (sys.platform == 'darwin' and not is_m_series)
        sd = StableDiffusion(
            model_path=args.model,
            clip_l_path=args.clip_l,
            clip_g_path=args.clip_g,
            vae_path=args.vae,
            n_threads=args.threads,
            keep_clip_on_cpu=use_cpu_offload,
            keep_vae_on_cpu=use_cpu_offload,
            verbose=True,
        )
        log("Model loaded successfully!")
    except Exception as e:
        log(f"ERROR loading model: {type(e).__name__}: {e}")
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)

    print("PROGRESS:10", flush=True)
    log(f"Generating: '{args.prompt[:60]}...' with sampler={args.sampler}")

    def progress_callback(step, steps, time):
        # Map step (0 to steps) to a percentage between 10% and 95%
        percent = 10 + int((step / steps) * 85)
        print(f"PROGRESS:{percent}", flush=True)
        log(f"Step {step}/{steps} completed")

    try:
        output = sd.generate_image(
            prompt=args.prompt,
            negative_prompt=args.negative_prompt,
            width=args.width,
            height=args.height,
            sample_steps=args.steps,
            cfg_scale=args.cfg,
            seed=args.seed,
            sample_method=args.sampler,   # pass exact string — library maps it internally
            progress_callback=progress_callback,
        )
    except Exception as e:
        log(f"ERROR during generation: {type(e).__name__}: {e}")
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)

    print("PROGRESS:95", flush=True)
    log(f"Saving to {args.output}...")

    try:
        images = output if isinstance(output, list) else [output]
        images[0].save(args.output)
    except Exception as e:
        log(f"ERROR saving image: {type(e).__name__}: {e}")
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)

    print("PROGRESS:100", flush=True)
    log(f"Done! Saved to {args.output}")
    sys.exit(0)


if __name__ == '__main__':
    main()
