# AcessaRápido

Plataforma de carteirinha digital para universidades e escolas.

🌐 **Site:** https://acessarapido.com.br

## Funcionalidades

- 🪪 Carteirinha digital com QR Code que rotaciona a cada 15 segundos (anti-fraude)
- 📊 Boletim de notas
- 🏫 Acesso à instituição (notícias, contatos)
- 📚 Apostilas e resumos
- 👨‍🎓 Multiplos perfis: aluno, professor, administrador
- 🎨 Painel admin para gerenciar carteirinhas, usuários e instituição
- 📱 Design mobile-first

## Demo (login)

| Perfil      | Login       | Senha     |
|-------------|-------------|-----------|
| Aluno       | `aluno`     | `1234`    |
| Professor   | `professor` | `1234`    |
| Admin       | `admin`     | `admin123`|

## Stack

100% estático — HTML5, CSS3, Vanilla JS. Sem build, sem dependências de servidor.

- Web Crypto API (SHA-256) para senhas
- localStorage como banco de dados
- QRCodeJS para geração de QR
- Plus Jakarta Sans + JetBrains Mono

## Rodar localmente

```bash
# qualquer servidor estático funciona
python -m http.server 8000
# ou
npx serve .
```

Acesse `http://localhost:8000`.

## Deploy

Site estático — pode ser hospedado em Netlify, Vercel, Cloudflare Pages, GitHub Pages ou qualquer hospedagem de arquivos.
