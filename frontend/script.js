document.addEventListener('DOMContentLoaded', () => {
  const chatList = ['vai-bate', 'lav']; // Simulação, pode ser substituído por uma requisição depois
  const listContainer = document.getElementById('chat-list');

  chatList.forEach(chatName => {
    const li = document.createElement('li');
    li.textContent = chatName;
    li.addEventListener('click', () => {
      setActiveChat(chatName);
      loadChat(chatName);
    });
    listContainer.appendChild(li);
  });

  if (chatList.length > 0) {
    setActiveChat(chatList[0]);
    loadChat(chatList[0]);
  }
});

function setActiveChat(chatName) {
  const chatItems = document.querySelectorAll('#chat-list li');
  chatItems.forEach(li => {
    if (li.textContent === chatName) {
      li.classList.add('active');
    } else {
      li.classList.remove('active');
    }
  });
}

function loadChat(chatName) {
  fetch(`../midia/text/${chatName}/chat.json`)
    .then(response => response.json())
    .then(data => renderChat(data, chatName))
    .catch(error => console.error('Erro ao carregar o chat:', error));
}

function renderChat(data, chatName) {
  const chatContainer = document.getElementById('chat');
  chatContainer.innerHTML = "";
  let currentDate = null;
  let previousSender = null;

  // Escolhe aleatoriamente um remetente para alinhar as mensagens à direita
  const senders = Array.from(new Set(data.messages.filter(m => m.sender).map(m => m.sender)));
  const mineSender = senders.length > 0 ? senders[Math.floor(Math.random() * senders.length)] : null;

  data.messages.forEach((message) => {
    if (message.date !== currentDate) {
      currentDate = message.date;
      previousSender = null;
      const dateHeader = document.createElement('div');
      dateHeader.classList.add('date-header');
      dateHeader.textContent = formatDate(currentDate);
      chatContainer.appendChild(dateHeader);
    }

    if (message.type === 'notification') {
      const notification = document.createElement('div');
      notification.classList.add('notification');
      notification.textContent = message.content;
      chatContainer.appendChild(notification);
      previousSender = null;
      return;
    }

    const messageElement = document.createElement('div');
    messageElement.classList.add('message');

    // Definindo classe para alinhamento
    if (message.sender === mineSender) {
      messageElement.classList.add('mine');
    } else {
      messageElement.classList.add('others');
    }

    // Mostrar sender só se mudou ou é diferente de null
    let showSender = true;
    if (previousSender && message.sender === previousSender) {
      showSender = false;
    }
    if (showSender && message.sender) {
      const senderDiv = document.createElement('div');
      senderDiv.classList.add('sender');
      senderDiv.textContent = message.sender;
      messageElement.appendChild(senderDiv);
    }

    const bubble = document.createElement('div');
    bubble.classList.add('bubble', message.type);
    const mediaPathPrefix = `../midia/external/${chatName}/`;

    if (message.type === 'text') {
      if (isValidUrl(message.content)) {
        const link = document.createElement('a');
        link.href = message.content;
        link.textContent = message.content;
        link.target = '_blank';
        bubble.appendChild(link);
      } else {
        bubble.textContent = message.content;
      }
    } else if (message.type === 'sticker') {
      const img = document.createElement('img');
      img.src = mediaPathPrefix + getFileName(message.content);
      img.alt = 'Sticker';
      bubble.appendChild(img);
      bubble.style.display = "inline-block";
      bubble.style.padding = "5px";
      bubble.style.backgroundColor = "transparent";
      bubble.style.border = "none";
    } else if (message.type === 'image') {
      const img = document.createElement('img');
      img.src = mediaPathPrefix + getFileName(message.content);
      img.alt = 'Imagem';
      bubble.appendChild(img);
      if (message.description) {
        const desc = document.createElement('div');
        desc.classList.add('description');
        desc.textContent = message.description;
        bubble.appendChild(desc);
      }
    } else if (message.type === 'pdf') {
      const icon = document.createElement('div');
      icon.classList.add('icon');
      icon.textContent = '📄';
      bubble.appendChild(icon);
      const fileInfo = document.createElement('div');
      fileInfo.classList.add('file-info');
      const fileName = document.createElement('div');
      fileName.textContent = getFileName(message.content);
      fileInfo.appendChild(fileName);
      const downloadButton = document.createElement('button');
      downloadButton.textContent = 'Download';
      downloadButton.addEventListener('click', () => {
        window.open(mediaPathPrefix + getFileName(message.content), '_blank');
      });
      fileInfo.appendChild(downloadButton);
      bubble.appendChild(fileInfo);
      if (message.description) {
        const desc = document.createElement('div');
        desc.classList.add('description');
        desc.textContent = message.description;
        bubble.appendChild(desc);
      }
    } else if (message.type === 'video') {
      const video = document.createElement('video');
      video.src = mediaPathPrefix + getFileName(message.content);
      video.controls = true;
      bubble.appendChild(video);
      if (message.description) {
        const desc = document.createElement('div');
        desc.classList.add('description');
        desc.textContent = message.description;
        bubble.appendChild(desc);
      }
    } else if (message.type === 'audio') {
      const audioContainer = document.createElement('div');
      audioContainer.classList.add('audio-player');

      const audio = document.createElement('audio');
      audio.src = mediaPathPrefix + getFileName(message.content);
      audio.preload = 'metadata';

      const playButton = document.createElement('button');
      playButton.textContent = 'Play';
      playButton.addEventListener('click', () => {
        if (audio.paused) {
          audio.play();
          playButton.textContent = 'Pause';
        } else {
          audio.pause();
          playButton.textContent = 'Play';
        }
      });

      const progressContainer = document.createElement('div');
      progressContainer.classList.add('progress-container');

      const progressBar = document.createElement('div');
      progressBar.classList.add('progress');
      progressContainer.appendChild(progressBar);

      const durationSpan = document.createElement('span');
      durationSpan.classList.add('duration');
      durationSpan.textContent = "0:00";

      audio.addEventListener('loadedmetadata', () => {
        const duration = audio.duration;
        durationSpan.textContent = formatTime(duration);
      });

      audio.addEventListener('timeupdate', () => {
        const percent = (audio.currentTime / audio.duration) * 100;
        progressBar.style.width = percent + "%";
      });

      progressContainer.addEventListener('click', (e) => {
        const rect = progressContainer.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        const percentage = offsetX / rect.width;
        audio.currentTime = percentage * audio.duration;
      });

      audio.addEventListener('ended', () => {
        playButton.textContent = 'Play';
        progressBar.style.width = "0%";
      });

      audioContainer.appendChild(playButton);
      audioContainer.appendChild(progressContainer);
      audioContainer.appendChild(durationSpan);
      bubble.appendChild(audioContainer);
    } else if (message.type === 'poll') {
      const pollContainer = document.createElement('div');
      pollContainer.classList.add('poll');
      const question = document.createElement('div');
      question.classList.add('poll-question');
      question.textContent = message.content.question;
      pollContainer.appendChild(question);
      const optionsList = document.createElement('div');
      optionsList.classList.add('poll-options');

      let totalVotes = 0;
      message.content.options.forEach(option => {
        totalVotes += option.votes;
      });

      message.content.options.forEach(option => {
        const optionDiv = document.createElement('div');
        optionDiv.classList.add('poll-option');

        const optionText = document.createElement('div');
        optionText.classList.add('option-text');
        optionText.textContent = `${option.text} (${option.votes} votos)`;
        optionDiv.appendChild(optionText);

        const optionBar = document.createElement('div');
        optionBar.classList.add('option-bar');
        let percent = totalVotes > 0 ? (option.votes / totalVotes) * 100 : 0;
        optionBar.style.width = percent + "%";
        optionDiv.appendChild(optionBar);

        optionsList.appendChild(optionDiv);
      });

      pollContainer.appendChild(optionsList);
      bubble.appendChild(pollContainer);
    }

    const timeSpan = document.createElement('span');
    timeSpan.classList.add('time');
    timeSpan.textContent = message.hour;
    bubble.appendChild(timeSpan);

    messageElement.appendChild(bubble);
    chatContainer.appendChild(messageElement);
    previousSender = message.sender;
  });

  // Scroll suave para o fim após renderizar
  chatContainer.scrollTo({
    top: chatContainer.scrollHeight,
    behavior: 'smooth'
  });
}

function formatDate(dateStr) {
  const parts = dateStr.split('/');
  return `${parts[0]}/${parts[1]}/${parts[2]}`;
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return mins + ":" + (secs < 10 ? "0" + secs : secs);
}

function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (err) {
    return false;
  }
}

function getFileName(path) {
  return path.split('/').pop();
}
