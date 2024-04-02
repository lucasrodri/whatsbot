# Estágio de base com todas as dependências do sistema necessárias
FROM node:20.12 as baseImage

# Definindo o diretório de trabalho no container
WORKDIR /usr/src/app

# Instalar as dependências do sistema necessárias
RUN apt-get update && apt-get install -y \
    gconf-service \
    libgbm-dev \
    libasound2 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgcc1 \
    libgconf-2-4 \
    libgdk-pixbuf2.0-0 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    ca-certificates \
    fonts-liberation \
    libappindicator1 \
    libnss3 \
    lsb-release \
    xdg-utils \
    wget \
 && rm -rf /var/lib/apt/lists/*

# Instalar o Chromium
RUN apt-get update && apt-get install -y chromium \
 && rm -rf /var/lib/apt/lists/*

# Adicione a variável de ambiente para Puppeteer pular a instalação do Chromium e use o binário instalado.
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Cria um usuário não-root e muda a propriedade do diretório de trabalho
RUN groupadd -r pptruser && useradd -r -g pptruser -G audio,video pptruser \
    && mkdir -p /home/pptruser/Downloads /usr/src/app \
    && chown -R pptruser:pptruser /home/pptruser /usr/src/app

USER pptruser

# Agora, como pptruser, copie os arquivos package*.json no diretório de trabalho.
COPY --chown=pptruser:pptruser package*.json ./

# Instalar as dependências do projeto Node.js especificadas no 'package.json'
RUN npm install

# Copie o restante dos arquivos para o diretório de trabalho, garantindo a propriedade correta.
COPY --chown=pptruser:pptruser . .

# Comando para rodar o aplicativo usando npm start conforme especificado no seu package.json
CMD [ "npm", "start" ]