# 🚿 Sistema de Controle de Chuveiro - Réplica

Este projeto é uma réplica funcional do sistema de notificação de chuveiro, desenvolvido com Flask e interface web moderna.

## 🎯 Funcionalidades

### ✅ Sistema de Autenticação
- **Cadastro de usuários** com validação
- **Login seguro** com hash de senhas
- **Sessões persistentes** com controle de estado
- **Logout** com limpeza de sessão

### 🚿 Controle do Chuveiro
- **Status em tempo real** (LIVRE/EM USO)
- **Seleção de duração** (5, 10, 15, 20+ minutos)
- **Controle de uso** (iniciar/finalizar)
- **Contador de tempo restante**
- **Identificação do usuário** que está usando

### 🎨 Interface
- **Design responsivo** similar ao original
- **Cores e layout** fiéis ao site de referência
- **Feedback visual** com alertas e status
- **Atualização automática** do status

## 🛠️ Tecnologias Utilizadas

- **Backend**: Flask (Python)
- **Banco de Dados**: SQLite com SQLAlchemy
- **Frontend**: HTML5, CSS3, JavaScript
- **Autenticação**: Werkzeug (hash de senhas)
- **Sessões**: Flask Sessions

## 📁 Estrutura do Projeto

```
chuveiro-app/
├── src/
│   ├── models/
│   │   └── user.py          # Modelos de dados (User, ShowerSession)
│   ├── routes/
│   │   └── user.py          # Rotas da API
│   ├── static/
│   │   └── index.html       # Interface web
│   ├── database/
│   │   └── app.db          # Banco SQLite
│   └── main.py             # Aplicação principal
├── venv/                   # Ambiente virtual
├── requirements.txt        # Dependências
└── README.md              # Esta documentação
```

## 🚀 Como Executar

### 1. Preparar o Ambiente
```bash
cd chuveiro-app
source venv/bin/activate
```

### 2. Instalar Dependências
```bash
pip install -r requirements.txt
```

### 3. Executar a Aplicação
```bash
python src/main.py
```

### 4. Acessar no Navegador
- URL: `http://localhost:5002`
- Criar conta ou fazer login
- Usar o sistema de controle do chuveiro

## 📊 API Endpoints

### Autenticação
- `POST /api/register` - Cadastrar usuário
- `POST /api/login` - Fazer login
- `POST /api/logout` - Fazer logout
- `GET /api/me` - Obter usuário atual

### Chuveiro
- `GET /api/shower/status` - Status atual do chuveiro
- `POST /api/shower/start` - Iniciar uso do chuveiro
- `POST /api/shower/end` - Finalizar uso do chuveiro
- `GET /api/shower/history` - Histórico de uso

## 🎨 Design

O design foi replicado fielmente do site original, incluindo:
- **Gradiente roxo** no fundo
- **Cards brancos** com bordas arredondadas
- **Ícones emoji** para visual amigável
- **Cores de status** (verde para livre, vermelho para ocupado)
- **Botões com hover effects**
- **Layout responsivo** para mobile

## 🔒 Segurança

- **Senhas hasheadas** com Werkzeug
- **Validação de entrada** nos formulários
- **Sessões seguras** do Flask
- **Verificação de autenticação** nas rotas protegidas

## 📱 Responsividade

- **Design adaptativo** para diferentes tamanhos de tela
- **Touch-friendly** para dispositivos móveis
- **Botões otimizados** para toque
- **Layout flexível** que se adapta ao conteúdo

## 🔄 Funcionalidades em Tempo Real

- **Atualização automática** do status a cada 5 segundos
- **Feedback imediato** nas ações do usuário
- **Sincronização** entre múltiplos usuários
- **Contador de tempo** dinâmico

## 🎯 Diferenças do Original

Esta réplica mantém todas as funcionalidades principais do site original, com algumas melhorias:
- **Sistema de autenticação** completo
- **Banco de dados** para persistência
- **API RESTful** bem estruturada
- **Código modular** e organizando

## 🚀 Deploy

Para fazer deploy em produção:

1. **Render.com** (recomendado)
2. **Heroku**
3. **PythonAnywhere**
4. **DigitalOcean**

Consulte o arquivo `guia_deploy_render.md` para instruções detalhadas.

## 👥 Usuário de Teste

Para testar rapidamente:
- **Usuário**: admin
- **Email**: admin@chuveiro.com
- **Senha**: admin123

## 📝 Notas

- O sistema suporta **múltiplos usuários** simultâneos
- Apenas **um usuário por vez** pode usar o chuveiro
- O **tempo restante** é calculado dinamicamente
- O **histórico** de uso é mantido no banco de dados

## 🔧 Desenvolvimento

Para continuar o desenvolvimento:
1. Ative o ambiente virtual
2. Faça suas modificações
3. Teste localmente
4. Atualize requirements.txt se necessário
5. Faça commit das mudanças

---

**Desenvolvido como réplica funcional do sistema original de controle de chuveiro.**

