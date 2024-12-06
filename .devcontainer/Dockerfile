FROM openjdk:11

ENV JAVA_HOME /usr/local/openjdk-11

RUN apt-get update && apt-get install -y \
    wget \
    unzip \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

RUN curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/debian $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null \
    && apt-get update \
    && apt-get install -y docker-ce-cli

RUN wget https://services.gradle.org/distributions/gradle-7.6.4-bin.zip -P /tmp \
    && unzip -d /opt/gradle /tmp/gradle-7.6.4-bin.zip \
    && rm /tmp/gradle-7.6.4-bin.zip

ENV PATH=$PATH:/opt/gradle/gradle-7.6.4/bin

RUN echo "parse_git_branch() { git branch --show-current 2>/dev/null; }" >> /root/.bashrc && \
    echo "PS1='$\\[\\033[32m\\][\$(parse_git_branch)]\\[\\033[0m\\]:\\[\\033[34m\\]\W\\[\\033[0m\\] '" >> /root/.bashrc

WORKDIR /workspace
