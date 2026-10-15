"""Merge .env files and render Cloud Run runtime env + Cloud Build config.

Usage: python3 deploy/render_env.py <out_dir> <image> <env_file>...
Later env files override earlier ones. Writes:
  <out_dir>/runtime.yaml     -> gcloud run deploy --env-vars-file
  <out_dir>/cloudbuild.yaml  -> gcloud builds submit --config
"""
import json
import re
import sys

REQUIRED = [
    "MONGODB_URI", "JWT_SECRET", "CRON_SECRET",
    "CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET",
    "RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET",
    "FIREBASE_SERVICE_ACCOUNT_JSON", "NEXT_PUBLIC_FIREBASE_API_KEY",
    "VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY",
]
# Without RAZORPAY_WEBHOOK_SECRET, subscription payment webhook/callback reject requests
OPTIONAL = ["RAZORPAY_WEBHOOK_SECRET", "RESEND_API_KEY", "GROQ_API_KEY"]
# Reserved by Cloud Run or only meaningful for local dev
SKIP = {"PORT", "FIREBASE_SERVICE_ACCOUNT_PATH"}
LINE = re.compile(r"^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$")


def parse(path):
    env = {}
    with open(path) as f:
        for raw in f:
            m = LINE.match(raw)
            if not m or raw.lstrip().startswith("#"):
                continue
            key, val = m.group(1), m.group(2).strip()
            if len(val) >= 2 and val[0] == val[-1] and val[0] in "'\"":
                val = val[1:-1]
            env[key] = val
    return env


def main():
    out_dir, image, files = sys.argv[1], sys.argv[2], sys.argv[3:]
    env = {}
    for path in files:
        env.update(parse(path))
    # Firebase web API key is the same value as the server-side web key
    if not env.get("NEXT_PUBLIC_FIREBASE_API_KEY") and env.get("FIREBASE_WEB_API_KEY"):
        env["NEXT_PUBLIC_FIREBASE_API_KEY"] = env["FIREBASE_WEB_API_KEY"]

    missing = [k for k in REQUIRED if not env.get(k)]
    if missing:
        sys.exit("Missing required env vars (add to .env.local): " + ", ".join(missing))
    for k in OPTIONAL:
        if not env.get(k):
            print(f"warning: {k} not set; related features stay disabled", file=sys.stderr)
    try:
        json.loads(env["FIREBASE_SERVICE_ACCOUNT_JSON"])
    except ValueError:
        sys.exit("FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON")

    runtime = {k: v for k, v in env.items() if k not in SKIP}
    with open(f"{out_dir}/runtime.yaml", "w") as f:
        for k, v in sorted(runtime.items()):
            f.write(f"{k}: {json.dumps(v)}\n")

    build_args = []
    for k, v in sorted(env.items()):
        if k.startswith("NEXT_PUBLIC_"):
            build_args += ["--build-arg", f"{k}={v}"]
    build = {
        "steps": [{
            "name": "gcr.io/cloud-builders/docker",
            "args": ["build", "-t", image, *build_args, "."],
        }],
        "images": [image],
        "options": {"logging": "CLOUD_LOGGING_ONLY"},
        "timeout": "1200s",
    }
    with open(f"{out_dir}/cloudbuild.yaml", "w") as f:
        json.dump(build, f, indent=2)
    print(f"runtime vars: {len(runtime)}, build args: {len(build_args) // 2}")


if __name__ == "__main__":
    main()
