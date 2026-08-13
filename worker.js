// worker.js - Cloudflare Worker para proxy seguro de Groq API

// Manejador principal del Worker
export default {
  async fetch(request, env) {
    // Manejar CORS preflight (OPTIONS)
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // Solo aceptamos POST
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Método no permitido' }), {
        status: 405,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    try {
      // Obtener el cuerpo de la petición
      const requestData = await request.json();
      const { messages } = requestData;

      if (!messages || !Array.isArray(messages)) {
        return new Response(JSON.stringify({ error: 'Se requiere un array de mensajes' }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }

      // Verificar que la API key existe en el entorno
      const GROQ_API_KEY = env.GROQ_API_KEY;
      if (!GROQ_API_KEY) {
        console.error('GROQ_API_KEY no configurada');
        return new Response(JSON.stringify({ error: 'API key no configurada' }), {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }

      // Preparar la petición a Groq
      const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile', // Modelo de 70B
          messages: messages,
          temperature: 0.7,
          max_tokens: 1024,
          stream: false,
        }),
      });

      // Verificar si la respuesta de Groq fue exitosa
      if (!groqResponse.ok) {
        const errorData = await groqResponse.text();
        console.error('Error de Groq:', errorData);
        return new Response(JSON.stringify({ 
          error: 'Error al comunicarse con Groq',
          details: errorData
        }), {
          status: groqResponse.status,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }

      // Procesar la respuesta de Groq
      const data = await groqResponse.json();
      
      // Extraer el mensaje de la respuesta
      let reply = 'Lo siento, no pude generar una respuesta.';
      if (data.choices && data.choices.length > 0) {
        reply = data.choices[0].message.content;
      }

      // Devolver la respuesta al frontend
      return new Response(JSON.stringify({ reply }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });

    } catch (error) {
      console.error('Error en el Worker:', error);
      return new Response(JSON.stringify({ 
        error: 'Error interno del Worker',
        details: error.message
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
  }
};
