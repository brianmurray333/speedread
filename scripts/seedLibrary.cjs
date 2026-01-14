const { createClient } = require('@supabase/supabase-js')
const { readFileSync, readdirSync } = require('fs')
const { join } = require('path')
const pdf = require('pdf-parse')

const supabaseUrl = 'https://regthoepcejfhoccujac.supabase.co'
const supabaseKey = 'sb_publishable_cABqIVtlsUVz8NviklYIeA_yPMF5b2i'
const supabase = createClient(supabaseUrl, supabaseKey)

const PDF_DIR = '/tmp/pdfs'

const titles = {
  'bitcoin.pdf': 'Bitcoin: A Peer-to-Peer Electronic Cash System',
  'declaration.pdf': 'Declaration of Independence',
  'constitution.pdf': 'United States Constitution',
  'attention.pdf': 'Attention Is All You Need (Transformer)',
  'imagenet.pdf': 'ImageNet Classification with Deep CNNs (AlexNet)',
  'dropout.pdf': 'Dropout: Preventing Neural Network Overfitting',
  'gpt.pdf': 'Improving Language Understanding (GPT)',
  'resnet.pdf': 'Deep Residual Learning (ResNet)',
  'adam.pdf': 'Adam: A Method for Stochastic Optimization',
  'batch_norm.pdf': 'Batch Normalization',
  'word2vec.pdf': 'Efficient Estimation of Word Representations (Word2Vec)',
  'gan.pdf': 'Generative Adversarial Networks (GAN)',
  'bert.pdf': 'BERT: Pre-training of Deep Bidirectional Transformers',
  'vae.pdf': 'Auto-Encoding Variational Bayes (VAE)',
  'lstm.pdf': 'Long Short-Term Memory (LSTM)',
  'alphago.pdf': 'Mastering the Game of Go (AlphaGo)',
  'diffusion.pdf': 'Denoising Diffusion Probabilistic Models',
  'clip.pdf': 'Learning Transferable Visual Models (CLIP)',
  'gpt3.pdf': 'Language Models are Few-Shot Learners (GPT-3)',
  'yolo.pdf': 'You Only Look Once: Real-Time Object Detection (YOLO)',
  'unet.pdf': 'U-Net: Convolutional Networks for Biomedical Segmentation'
}

async function extractTextFromPDF(filePath) {
  try {
    const dataBuffer = readFileSync(filePath)
    const data = await pdf(dataBuffer)
    return data.text.trim()
  } catch (error) {
    console.error(`Error extracting text from ${filePath}:`, error.message)
    return null
  }
}

async function seedLibrary() {
  const files = readdirSync(PDF_DIR).filter(f => f.endsWith('.pdf'))
  console.log(`Found ${files.length} PDF files\n`)
  
  let successCount = 0
  
  for (const file of files) {
    const filePath = join(PDF_DIR, file)
    const title = titles[file] || file.replace('.pdf', '')
    
    console.log(`Processing: ${title}...`)
    
    const text = await extractTextFromPDF(filePath)
    if (!text || text.length < 100) {
      console.log(`  ⚠️ Skipped (no text extracted)`)
      continue
    }
    
    const words = text.split(/\s+/).filter(w => w.length > 0)
    
    const { error } = await supabase
      .from('documents')
      .insert({
        title,
        text_content: text,
        word_count: words.length,
        is_public: true
      })
    
    if (error) {
      console.log(`  ❌ Error: ${error.message}`)
    } else {
      console.log(`  ✅ Added (${words.length.toLocaleString()} words)`)
      successCount++
    }
  }
  
  console.log(`\n✅ Successfully added ${successCount} documents to the library!`)
}

seedLibrary()
