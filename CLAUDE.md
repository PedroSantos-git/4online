# CLAUDE.md

## O que é
www.4online.pt: a página principal da 4online. Mostra os **serviços pagos** (SantosProxy, Santos Subtitles, Alto Mar) e os **projetos** (escola, casa, jogos), e é o "site do negócio" da conta Stripe partilhada (ver `/Users/pedrosantos/Code/PT-PT/docs/STRIPE-CONTA-PARTILHADA.md`).

**Página estática, sem base de dados, sem login e sem backoffice** (decisão do Pedro, 16/11/2026). Os projetos são acrescentados, retirados ou reorganizados pelo Claude, a pedido do Pedro, editando o `index.html`.

## Ficheiros
- `index.html`: todo o conteúdo, em PT e EN (`<span lang="pt">` / `<span lang="en">`; a língua escolhida fica em `<html data-lang>`).
- `site.css`: estilo comum "4online Glass", **igual byte a byte** ao dos outros sites (`/Users/pedrosantos/Code/Proxy/public/site.css`, `/Users/pedrosantos/Code/PT-PT/assets/site.css`); ver `PT-PT/docs/VISUAL.md`. Nunca alterar só aqui.
- `home.css`: estilos só desta página (cartões `.tile`, `.tile.service`, `.tile.wide`, sub-cartões `.sub`, grupos `h3.group`).
- `app.js`: só o seletor de língua.
- `icons/`: ícone 4online (`4online.svg`, `icon-512.png`, `apple-touch-icon.png`, `favicon-32.png`).
- `img/`: capturas de ecrã de cada site (JPEG, 800 px de largura). Para atualizar uma: Chrome headless 1280×800 (`--force-dark-mode`) e `sips -s format jpeg -s formatOptions 72 --resampleWidth 800`.

## Regras
- **Sem dados pessoais:** nada de nome completo, NIF, morada ou telefone nesta página. O contacto é `support@store.4online.pt`. A identificação legal do prestador está só na secção 1 dos Termos de cada serviço pago.
- Cartões de serviços e de projetos levam diretamente ao site (o cartão inteiro é um link). Projetos com várias partes usam um cartão com sub-cartões.
- Cada serviço pago novo: cartão em "Serviços 4online" e linha na tabela "Pagamentos e apoio" (preços, termos, privacidade, reembolsos).
- Tudo em PT-PT e EN.

## Publicar
Sem build. `vercel --prod --yes` nesta pasta (o push para o GitHub não faz deploy). Verificar em https://www.4online.pt.
