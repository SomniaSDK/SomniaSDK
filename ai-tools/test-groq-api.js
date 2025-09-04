#!/usr/bin/env node

import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const GROQ_API_KEY = process.env.GROQ_API_KEY;

if (!GROQ_API_KEY) {
  console.error('❌ Error: GROQ_API_KEY not found in .env file');
  process.exit(1);
}

console.log('🔑 API Key found:', GROQ_API_KEY.substring(0, 10) + '...');

async function testGroqAPI() {
  try {
    console.log('🔄 Testing Groq API connection...');
    
    const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
      model: 'llama-3.1-8b-instant',
      messages: [{
        role: 'user',
        content: 'Say hello world'
      }],
      temperature: 0.1,
      max_tokens: 20
    }, {
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Groq API working!');
    console.log('📄 Response:', response.data.choices[0].message.content);
    return true;
  } catch (error) {
    console.error('❌ Groq API error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
    return false;
  }
}

testGroqAPI();
