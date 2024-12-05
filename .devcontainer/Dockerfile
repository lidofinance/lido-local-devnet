FROM openjdk:11

RUN apt-get update && apt-get install -y wget unzip \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    && curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/debian $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null \
    && apt-get update && apt-get install -y docker-ce-cli


RUN wget https://services.gradle.org/distributions/gradle-8.11.1-bin.zip -P /tmp \
    && unzip -d /opt/gradle /tmp/gradle-8.11.1-bin.zip \
    && rm /tmp/gradle-8.11.1-bin.zip
ENV PATH=$PATH:/opt/gradle/gradle-8.11.1/bin

WORKDIR /workspace
