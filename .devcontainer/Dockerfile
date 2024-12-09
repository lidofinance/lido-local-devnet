FROM openjdk:11

# Set the JAVA_HOME environment variable
ENV JAVA_HOME /usr/local/openjdk-11

# Install necessary packages
RUN apt-get update && apt-get install -y \
    wget \
    unzip \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

# Add Docker’s official GPG key
RUN curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Set up the Docker repository
RUN echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/debian $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null \
    && apt-get update \
    && apt-get install -y docker-ce-cli

# Install Gradle
RUN wget https://services.gradle.org/distributions/gradle-7.6.4-bin.zip -P /tmp \
    && unzip -d /opt/gradle /tmp/gradle-7.6.4-bin.zip \
    && rm /tmp/gradle-7.6.4-bin.zip

# Update the PATH environment variable
ENV PATH=$PATH:/opt/gradle/gradle-7.6.4/bin

# Configure bash prompt and add parse_git_branch function
RUN echo "parse_git_branch() { git branch --show-current 2>/dev/null; }" >> /root/.bashrc \
    && echo "PS1='$\\[\\033[32m\\][\$(parse_git_branch)]\\[\\033[0m\\]:\\[\\033[34m\\]\W\\[\\033[0m\\]$ '" >> /root/.bashrc

# Install Foundry
RUN curl -L https://foundry.paradigm.xyz | bash \
    && /root/.foundry/bin/foundryup

# Update the PATH environment variable
ENV PATH="/root/.cargo/bin:${PATH}"

# Add Kurtosis repository
RUN echo "deb [trusted=yes] https://apt.fury.io/kurtosis-tech/ /" | tee /etc/apt/sources.list.d/kurtosis.list \
    && apt-get update \
    && apt-get install -y kurtosis-cli

# Install dbus package which includes dbus-uuidgen
RUN apt-get update && apt-get install -y dbus

# Create and populate the machine-id file
RUN dbus-uuidgen > /etc/machine-id


# Set the working directory
WORKDIR /workspace
