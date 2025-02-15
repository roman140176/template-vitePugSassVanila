import { defineConfig } from 'vite'
import { createSvgIconsPlugin } from 'vite-plugin-svg-icons'
import viteImagemin from 'vite-plugin-imagemin'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import path from 'path'
import fs from 'fs'
import pug from 'pug'

// Функция для проверки существования директории
function directoryExists(path) {
  try {
    return fs.statSync(path).isDirectory()
  } catch (err) {
    return false
  }
}

// Функция для получения целей копирования
function getCopyTargets() {
  const targets = []
  const assetsPath = path.resolve(__dirname, 'src/assets')

  // Добавляем images если директория существует
  if (directoryExists(path.join(assetsPath, 'images'))) {
    targets.push({
      src: path.resolve(__dirname, 'src/assets/images/**/*'),
      dest: 'assets/images'
    })
  }

  // Добавляем fonts если директория существует
  if (directoryExists(path.join(assetsPath, 'fonts'))) {
    targets.push({
      src: path.resolve(__dirname, 'src/assets/fonts/**/*'),
      dest: 'assets/fonts'
    })
  }

  return targets
}

// Функция для рендеринга Pug в HTML
function renderPugToHtml(pugPath) {
  return pug.renderFile(pugPath, {
    pretty: true,
    basedir: path.resolve(__dirname, 'src/pug')
  })
}

// Функция для генерации HTML файлов
function generateHtmlFiles() {
  const pagesDir = path.resolve(__dirname, 'src/pug/pages')
  const files = fs.readdirSync(pagesDir)
  
  files.forEach(file => {
    if (file.endsWith('.pug')) {
      const name = file.replace('.pug', '')
      const html = renderPugToHtml(path.join(pagesDir, file))
      fs.writeFileSync(
        path.resolve(__dirname, `src/${name}.html`),
        html
      )
    }
  })
  
  return files
    .filter(file => file.endsWith('.pug'))
    .reduce((acc, file) => {
      const name = file.replace('.pug', '')
      acc[name] = path.resolve(__dirname, `src/${name}.html`)
      return acc
    }, {})
}

// Создаем плагин для работы с Pug
function pugPlugin() {
  return {
    name: 'vite-plugin-pug-transformer',
    handleHotUpdate({ file, server }) {
      if (file.endsWith('.pug')) {
        const pagesDir = path.resolve(__dirname, 'src/pug/pages')
        const files = fs.readdirSync(pagesDir)
        
        files.forEach(pugFile => {
          if (pugFile.endsWith('.pug')) {
            const name = pugFile.replace('.pug', '')
            const pugPath = path.join(pagesDir, pugFile)
            const html = renderPugToHtml(pugPath)
            
            fs.writeFileSync(
              path.resolve(__dirname, `src/${name}.html`),
              html
            )
          }
        })

        server.ws.send({
          type: 'full-reload'
        })
        return []
      }
    }
  }
}

// Создаем плагин для перемещения скриптов
function moveScriptsToBody() {
  return {
    name: 'move-scripts-to-body',
    transformIndexHtml(html) {
      const moduleScripts = html.match(/<script[^>]*type="module"[^>]*>[\s\S]*?<\/script>/g) || []
      let newHtml = html
      moduleScripts.forEach(script => {
        newHtml = newHtml.replace(script, '')
      })
      return newHtml.replace(
        '</body>',
        moduleScripts.join('\n') + '</body>'
      )
    }
  }
}

export default defineConfig({
  root: 'src',
  base: './',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: generateHtmlFiles()
    }
  },
  plugins: [
    pugPlugin(),
    moveScriptsToBody(),
    createSvgIconsPlugin({
      iconDirs: [path.resolve(process.cwd(), 'src/assets/svg')],
      symbolId: 'icon-[dir]-[name]'
    }),
    viteImagemin({
      gifsicle: {
        optimizationLevel: 7,
        interlaced: false
      },
      optipng: {
        optimizationLevel: 7
      },
      mozjpeg: {
        quality: 80
      },
      pngquant: {
        quality: [0.8, 0.9],
        speed: 4
      },
      svgo: {
        plugins: [
          {
            name: 'removeViewBox'
          },
          {
            name: 'removeEmptyAttrs',
            active: false
          }
        ]
      }
    }),
    viteStaticCopy({
      targets: getCopyTargets()
    })
  ],
  css: {
    preprocessorOptions: {
      scss: {
        includePaths: [path.resolve(__dirname, 'src/styles')]
      }
    },
    extract: 'styles/app.css'
  },
  server: {
    port: 3000,
    open: true,
    cors: true,
    watch: {
      include: [
        'src/**/*.pug',
        'src/**/*.{scss,css}',
        'src/**/*.js',
        'src/assets/**/*'
      ]
    },
    hmr: {
      overlay: true,
      protocol: 'ws',
      host: 'localhost',
      port: 3000
    }
  },
  optimizeDeps: {
    include: ['pug']
  }
})