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

async function listGroqModels() {
  try {
    console.log('🔄 Listing available Groq models...');
    
    const response = await axios.get('https://api.groq.com/openai/v1/models', {
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`
      }
    });
    
    console.log('✅ Available models:');
    response.data.data.forEach(model => {
      console.log(`- ${model.id}`);
    });
  } catch (error) {
    console.error('❌ Error fetching models:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

listGroqModels();
