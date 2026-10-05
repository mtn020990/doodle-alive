# Meta AnimatedDrawings (MIT) as an HTTP service: POST /animate (image, motion) -> GIF.
# Follows the repo's own torchserve/Dockerfile, with CPU-only torch, headless OpenGL
# (OSMesa, the repo's documented USE_MESA option) and a small Flask wrapper on top.
# Built in Azure by scripts/deploy-azure.ps1 -Part character (takes a while: big ML stack).
# Base: official Python 3.8 on Debian 12. The repo's miniconda3:24.1.2-0 is Debian 11,
# whose package mirrors are gone, so apt-get fails there.
FROM python:3.8-slim-bookworm

RUN mkdir -p /usr/share/man/man1 && apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install --no-install-recommends -y \
    ca-certificates curl wget default-jre git gcc build-essential \
    libosmesa6 libosmesa6-dev libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Same versions as the repo's torchserve/Dockerfile, but CPU wheels (no GPU here, much smaller image).
RUN pip install --no-cache-dir --progress-bar off openmim && \
    pip install --no-cache-dir --progress-bar off torch==2.0.0 torchvision==0.15.1 \
        --index-url https://download.pytorch.org/whl/cpu && \
    mim install mmcv-full==1.7.0 && \
    pip install --no-cache-dir --progress-bar off mmdet==2.27.0 torchserve

# bugfix for xtcocoapi, an mmpose dependency (from the repo's Dockerfile)
RUN git clone --depth 1 https://github.com/jin-s13/xtcocoapi.git /tmp/xtcocoapi && \
    cd /tmp/xtcocoapi && pip install --no-cache-dir -r requirements.txt && python setup.py install && \
    rm -rf /tmp/xtcocoapi
RUN pip install --no-cache-dir --progress-bar off mmpose==0.29.0 numpy==1.24.4

# The two detection / pose models, baked into the image so nothing downloads at run time.
RUN mkdir -p /home/torchserve/model-store && \
    wget -q https://github.com/facebookresearch/AnimatedDrawings/releases/download/v0.0.1/drawn_humanoid_detector.mar -P /home/torchserve/model-store/ && \
    wget -q https://github.com/facebookresearch/AnimatedDrawings/releases/download/v0.0.1/drawn_humanoid_pose_estimator.mar -P /home/torchserve/model-store/

RUN git clone --depth 1 https://github.com/facebookresearch/AnimatedDrawings.git /opt/AnimatedDrawings && \
    pip install --no-cache-dir --progress-bar off -e /opt/AnimatedDrawings && \
    cp /opt/AnimatedDrawings/torchserve/config.properties /home/torchserve/config.properties

# One worker per model: the default (one per CPU) runs out of memory and crash-loops.
RUN printf '\ndefault_workers_per_model=1\n' >> /home/torchserve/config.properties

ENV PYOPENGL_PLATFORM=osmesa \
    MESA_GL_VERSION_OVERRIDE=3.3 \
    PYTHONUNBUFFERED=1

COPY server.py render_job.py start.sh /app/
RUN sed -i 's/\r$//' /app/start.sh && chmod +x /app/start.sh

EXPOSE 5000
CMD ["/app/start.sh"]
