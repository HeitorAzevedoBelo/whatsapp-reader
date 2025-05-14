const fs = require('fs');
const path = require('path');

function isNewMessage(line) {
  line = line.trim();
  if (line.startsWith("[")) {
    line = line.substring(1);
  }
  const regex = /^\d{2}\/\d{2}\/\d{4}/;
  return regex.test(line);
}

function extractDateHour(datetime) {
  const parts = datetime.split(' ');
  const date = parts[0];
  let hour = parts[1] || "";
  if (hour.length >= 5) {
    hour = hour.substring(0, 5);
  }
  return { date, hour };
}

function parseInitialLine(line) {
  const closingBracketIndex = line.indexOf("]");
  if (closingBracketIndex === -1) {
    const splitLine = line.split(" - ");
    const datetime = splitLine.shift();
    const messageStr = splitLine.join(" - ");
    return { datetime, messageStr };
  }
  const datetime = line.substring(1, closingBracketIndex).trim();
  const messageStr = line.substring(closingBracketIndex + 1).trim();
  return { datetime, messageStr };
}

function cleanContent(content) {
  return content.replace("(arquivo anexado)", "").replace(/\u200E/g, "").trim();
}

function parseMessageContent(messageStr) {
  const colonIndex = messageStr.indexOf(":");
  if (colonIndex !== -1) {
    const sender = messageStr.substring(0, colonIndex).trim();
    const content = messageStr.substring(colonIndex + 1).trim();
    return { sender, content };
  } else {
    return { sender: null, content: messageStr.trim() };
  }
}

function determineMessageTypeOld(content) {
  if (content.includes("(arquivo anexado)")) {
    if (/\.(webp)$/i.test(content)) {
      return "sticker";
    } else if (/\.(jpg|png)$/i.test(content)) {
      return "image";
    } else if (/\.(pdf)$/i.test(content)) {
      return "pdf";
    } else if (/\.(mp4)$/i.test(content)) {
      return "video";
    }
  }
  return "text";
}

function processChatFile(inputFile, outputDir, chatName) {
  try {
    const rawData = fs.readFileSync(inputFile, 'utf8');
    let lines = rawData.split(/\r?\n/).map(line => line.replace(/\u200E/g, "").trim());
    const messages = [];

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      if (!line) continue;
      if (!isNewMessage(line)) continue;

      let { datetime, messageStr } = parseInitialLine(line);
      let { date, hour } = extractDateHour(datetime);
      let parsed = parseMessageContent(messageStr);
      let message = {
        date,
        hour,
        sender: parsed.sender,
        type: parsed.sender ? "text" : "notification",
        content: parsed.content,
        description: ""
      };

      if (message.sender && message.sender.startsWith("[")) {
        message.type = "notification";
      }

      if (message.content.trim().toUpperCase().startsWith("ENQUETE:")) {
        message.type = "poll";
        let poll = { question: "", options: [] };
        let afterEnquete = message.content.trim().substring("ENQUETE:".length).trim();
        if (afterEnquete !== "") {
          poll.question = afterEnquete;
        } else if (i + 1 < lines.length && !isNewMessage(lines[i + 1])) {
          poll.question = lines[i + 1].trim();
          i++;
        }
        while (i + 1 < lines.length && !isNewMessage(lines[i + 1])) {
          let nextLine = lines[i + 1].trim();
          if (nextLine.toUpperCase().startsWith("OPÇÃO:")) {
            let optionTextAndVotes = nextLine.substring("OPÇÃO:".length).trim();
            let match = optionTextAndVotes.match(/(.+)\((\d+)\s+votos\)/i);
            if (match) {
              let optionText = match[1].trim();
              let votes = parseInt(match[2]);
              poll.options.push({ text: optionText, votes });
            } else {
              poll.options.push({ text: optionTextAndVotes, votes: 0 });
            }
            i++;
          } else {
            break;
          }
        }
        message.content = poll;
      }
      else if (message.content.trim().startsWith("<anexado:")) {
        let extracted = message.content.trim();
        extracted = extracted.substring("<anexado:".length, extracted.length - 1).trim();

        // Prepend chatName folder to content to reflect media path
        message.content = path.join(chatName, extracted).replace(/\\/g, '/');

        if (/\.(webp)$/i.test(extracted)) {
          message.type = "sticker";
        } else if (/\.(jpg|png)$/i.test(extracted)) {
          message.type = "image";
        } else if (/\.(mp4)$/i.test(extracted)) {
          message.type = "video";
        } else if (/\.(pdf)$/i.test(extracted)) {
          message.type = "pdf";
        } else if (/\.(opus)$/i.test(extracted)) {
          message.type = "audio";
          message.duration = null;
        } else {
          message.type = "text";
        }
        if (i + 1 < lines.length && !isNewMessage(lines[i + 1]) && lines[i + 1] !== "") {
          message.description = lines[i + 1].trim();
          i++;
        }
      }
      else if (message.content.includes("(arquivo anexado)")) {
        message.type = determineMessageTypeOld(message.content);
        message.content = cleanContent(message.content);

        // Prepend chatName folder to content if media type
        if (message.type !== "text") {
          message.content = path.join(chatName, message.content).replace(/\\/g, '/');
        }

        if (i + 1 < lines.length && !isNewMessage(lines[i + 1]) && lines[i + 1] !== "") {
          message.description = lines[i + 1].trim();
          i++;
        }
      }

      messages.push(message);
    }

    const outputFile = path.join(outputDir, 'chat.json');
    const outputData = { messages };
    fs.writeFileSync(outputFile, JSON.stringify(outputData, null, 2));
    console.log("Arquivo JSON criado com sucesso:", outputFile);
  } catch (error) {
    console.error("Erro ao processar o arquivo de chat:", error);
  }
}

function main() {
  const chatName = process.argv[2];
  if (!chatName) {
    console.error("Por favor, informe o nome do chat como argumento. Exemplo: node read_chat.js chat1");
    process.exit(1);
  }

  const inputFile = './midia/text/chat.txt';
  const outputDir = `./midia/text/${chatName}`;

  processChatFile(inputFile, outputDir, chatName);
}

main();

module.exports = {
  isNewMessage,
  extractDateHour,
  parseInitialLine,
  cleanContent,
  parseMessageContent,
  determineMessageTypeOld,
  processChatFile
};
