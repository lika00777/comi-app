import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const text = formData.get('text') as string | null

    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'OPENROUTER_API_KEY não configurada' }, { status: 500 })
    }

    if (!file && !text) {
      return NextResponse.json({ error: 'Nenhum ficheiro ou texto fornecido' }, { status: 400 })
    }

    const prompt = `
      Analisa este documento de fatura/venda e extrai as seguintes informações num formato JSON puro (sem markdown blocks):
      {
        "numero_fatura": "string",
        "data": "YYYY-MM-DD",
        "cliente_nome": "string",
        "itens": [
          {
            "artigo": "string",
            "quantidade": number,
            "preco_unitario": number,
            "tipo_sugerido": "string (ex: Hardware, Software, Serviço, Consumível)"
          }
        ]
      }
      Tenta ser o mais preciso possível. Se não encontrares algum campo, deixa-o vazio ou null.
      Importante: Retorna APENAS o JSON.
    `

    let messages: any[] = []

    if (file) {
      const buffer = await file.arrayBuffer()
      const base64Content = Buffer.from(buffer).toString('base64')
      const mimeType = file.type

      messages = [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64Content}`
              }
            }
          ]
        }
      ]
    } else {
      messages = [
        {
          role: 'user',
          content: prompt + '\n\nTexto do documento:\n' + text
        }
      ]
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://comi.app',
        'X-Title': 'Comi App',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-exp:free',
        messages: messages,
        // Algumas versões gratuitas falham com json_object, vamos confiar no prompt
        temperature: 0.1
      })
    })

    const result = await response.json()

    if (!response.ok) {
      console.error('Erro detalhado do OpenRouter:', JSON.stringify(result, null, 2))
      const msg = result.error?.message || `Erro ${response.status}: ${response.statusText}`
      return NextResponse.json({ error: msg }, { status: response.status })
    }

    if (!result.choices?.[0]?.message?.content) {
      console.error('Resposta vazia do OpenRouter:', result)
      return NextResponse.json({ error: 'A IA devolveu uma resposta vazia' }, { status: 500 })
    }

    const content = result.choices[0].message.content
    console.log('Resposta bruta da IA:', content)
    
    // Limpeza robusta de blocos de código markdown
    let jsonText = content.trim()
    if (jsonText.includes('```')) {
      const match = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
      if (match) {
        jsonText = match[1]
      }
    }
    
    try {
      const data = JSON.parse(jsonText)
      return NextResponse.json(data)
    } catch (parseError) {
      console.error('Erro ao processar JSON da IA. Conteúdo:', jsonText)
      return NextResponse.json({ 
        error: 'A IA não devolveu um formato válido. Tenta novamente.',
        raw: content 
      }, { status: 500 })
    }

  } catch (error: any) {
    console.error('ERRO CRÍTICO NA EXTRAÇÃO:', error)
    return NextResponse.json({ error: 'Erro interno no servidor de extração' }, { status: 500 })
  }
}
