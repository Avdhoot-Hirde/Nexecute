FROM ubuntu:24.04
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 nodejs node-typescript openjdk-21-jdk-headless gcc g++ golang-go rustc ruby php-cli coreutils \
    && rm -rf /var/lib/apt/lists/*
COPY --chmod=755 run.sh /usr/local/bin/nexecute-run
USER 10001:10001
WORKDIR /work
ENV HOME=/work PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
ENTRYPOINT ["timeout", "--signal=KILL", "30s", "/usr/local/bin/nexecute-run"]
