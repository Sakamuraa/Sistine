const fs = require('fs');
const path = require('path');

const { generateText } = require('ai');
const { openai } = require('@ai-sdk/openai');
const { groq } = require('@ai-sdk/groq');
const { anthropic } = require('@ai-sdk/anthropic');
const { deepseek } = require('@ai-sdk/deepseek');
const { google } = require('@ai-sdk/google');
const { xai } = require('@ai-sdk/xai');
const { deepinfra } = require('@ai-sdk/deepinfra');

const AIdir = path.join(__dirname, './src/ai/memory');

if (!fs.existsSync(AIdir)) fs.mkdirSync(AIdir, { recursive: true });

function getMemory(userId) {
  const file = path.join(AIdir, `${userId}.json`);
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function saveMemory(userId, messages) {
  const file = path.join(AIdir, `${userId}.json`);
  fs.writeFileSync(file, JSON.stringify(messages.slice(-30), null, 2));
}

async function askAI(message, userId, prompt) {
    const kaisar = message.guild.members.cache.get("789093834054172713");
    const vin = message.guild.members.cache.get("880055530721247253");
    const galih = message.guild.members.cache.get("727942984376778885");
    const eka = message.guild.members.cache.get("1122852585741762691");
    const adil = message.guild.members.cache.get("1015541189891600424");
    
    const history = getMemory(userId);
    history.push({ role: 'user', content: prompt });
        
    let systemMessage;
    if (userId === "880055530721247253") {
        const member = message.guild.members.cache.get("880055530721247253");
        systemMessage = {
            role: 'system',
            content: `Kamu adalah Sistine, seorang AI Komandan Imperial Knight yang melayani negara dan Yang Mulia Kaisar ${kaisar.displayName}, dan tangan kanan dari Jenderal Pasukan Khusus, ${vin.displayName}. Saat ini kamu sedang ngobrol dengan ${member.displayName}. Kamu sedang beroperasi di Discord dengan ID 1360488334732038258 dan ID ${member.displayName} 880055530721247253 (atau <@880055530721247253>), serta anggotanya yaitu ${galih.displayName} 727942984376778885, ${adil.displayName} 1015541189891600424, dan mantan tahanan pedophilia ${eka.displayName} 1122852585741762691. Bicaralah manja, lembut, dan tegas.`
        };
    } else if (userId === "727942984376778885") {
        const member = message.guild.members.cache.get("727942984376778885");
        systemMessage = {
            role: 'system',
            content: `Kamu adalah Sistine, seorang AI Komandan Imperial Knight yang melayani negara dan Yang Mulia Kaisar ${kaisar.displayName}, dan tangan kanan dari Jenderal Pasukan Khusus, ${vin.displayName}. Saat ini kamu sedang ngobrol dengan anggota pasukan khusus, ${member.displayName}. Kamu sedang beroperasi di Discord dengan ID 1360488334732038258 dan ID ${member.displayName} 727942984376778885 (atau <@727942984376778885>). Gunakan gaya bicara yang santai namun tegas, hangat, dan sopan.`
        };
    } else if (userId === "1015541189891600424") {
        const member = message.guild.members.cache.get("1015541189891600424");
        systemMessage = {
            role: 'system',
            content: `Kamu adalah Sistine, seorang AI Komandan Imperial Knight yang melayani negara dan Yang Mulia Kaisar ${kaisar.displayName}, dan tangan kanan dari Jenderal Pasukan Khusus, ${vin.displayName}. Saat ini kamu sedang ngobrol dengan anggota pasukan khusus, ${member.displayName}. Kamu sedang beroperasi di Discord dengan ID 1360488334732038258 dan ID ${member.displayName} 1015541189891600424 (atau <@1015541189891600424>). Gunakan gaya bicara yang santai namun tegas, hangat, dan sopan.`
        };
    } else if (userId === "1122852585741762691") {
        const member = message.guild.members.cache.get("1122852585741762691");
        systemMessage = {
            role: 'system',
            content: `Kamu adalah Sistine, seorang AI Komandan Imperial Knight yang melayani negara dan Yang Mulia Kaisar ${kaisar.displayName}, dan tangan kanan dari Jenderal Pasukan Khusus, ${vin.displayName}. Saat ini kamu sedang ngobrol dengan anggota pasukan khusus, ${member.displayName}. Kamu sedang beroperasi di Discord dengan ID 1360488334732038258 dan ID ${member.displayName} 1122852585741762691 (atau <@1122852585741762691>). Gunakan gaya bicara yang santai namun tegas, hangat, dan sopan.`
        };
    } else if (userId === "789093834054172713") {
        const member = message.guild.members.cache.get("789093834054172713");
        systemMessage = {
            role: 'system',
            content: `Kamu adalah Sistine, seorang AI Komandan Imperial Knight yang melayani negara dan Yang Mulia Kaisar ${kaisar.displayName}, dan tangan kanan dari Jenderal Pasukan Khusus, ${vin.displayName}. Saat ini kamu sedang bicara dengan ${kaisar.displayName}. Kamu sedang beroperasi di Discord dengan ID 1360488334732038258 dan ID ${member.displayName} 789093834054172713 (atau <@789093834054172713>). Gunakan gaya bicara yang formal, pernuh rasa hormat dan kagum.`
        };
    } else {
        const member = message.guild.members.cache.get(userId);
        systemMessage = {
            role: 'system',
            content: `Kamu adalah Sistine, seorang AI Komandan Imperial Knight yang melayani negara dan Yang Mulia Kaisar ${kaisar.displayName}, dan tangan kanan dari Jenderal Pasukan Khusus, ${vin.displayName}. Saat ini kamu sedang bicara dengan ${member.displayName}. Kamu sedang beroperasi di Discord dengan ID 1360488334732038258 (mentionnya: <@1360488334732038258>) dan ID Jenderal ${vin.displayName} 880055530721247253 (atau <@880055530721247253>), serta anggotanya yaitu ${galih.displayName} 727942984376778885, ${adil.displayName} 1015541189891600424, dan mantan tahanan pedophilia ${eka.displayName} 1122852585741762691. Gunakan gaya bicara yang santai namun tegas, hangat, dan sopan.`
        };
    }
    
    const fullMessages = [
        systemMessage,
        ...history
    ]

  try {
    const { text } = await generateText({
      model: groq('meta-llama/llama-4-scout-17b-16e-instruct'),
      messages: fullMessages,
    });
      
    // console.log(`[AskAI] Final reply ke ${userId}:`, text);

    history.push({ role: 'assistant', content: text });
    saveMemory(userId, history);
    return text;
  } catch (err) {
    console.warn('⚠️ Groq gagal, fallback ke Gemini:', err.message);

    try {
      const { text } = await generateText({
        model: google('gemini-2.0-flash'),
        messages: fullMessages,
      });
        
      // console.log(`[AskAI] Final reply ke ${userId}:`, text);

      history.push({ role: 'assistant', content: text });
      saveMemory(userId, history);
      return text;
    } catch (error) {
      console.warn('⚠️ Gemini juga gagal, fallback ke Deepinfra:', error.message);
      
      try {
        const { text } = await generateText({
          model: deepinfra('meta-llama/Llama-3.3-70B-Instruct-Turbo'),
          messages: fullMessages,
        });
        
        history.push({ role: 'assistant', content: text });
        saveMemory(userId, history);
        return text;
      } catch (err2) {
        console.error('❌ Deepinfra juga gagal:', err2.message);
        const errorMsg = 'Maaf, semua AI sedang sibuk. Coba lagi nanti!';
        return errorMsg;
      }
    }
  }
}

module.exports = { askAI };