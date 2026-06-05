<?php

return [
    // Segredo exigido para disparar o deploy. Defina DEPLOY_SECRET no .env do
    // servidor com um valor longo e aleatório. Sem ele, o endpoint fica desligado.
    'secret' => env('DEPLOY_SECRET'),

    // Branch puxada no deploy.
    'branch' => env('DEPLOY_BRANCH', 'master'),

    // Caminho do repositório git no servidor. Por padrão usa a raiz do Laravel
    // (base_path). Em monorepo, onde o .git fica ACIMA da raiz do Laravel,
    // defina DEPLOY_REPO_PATH apontando para o diretório que contém o .git.
    'repo_path' => env('DEPLOY_REPO_PATH'),

    // Binário do PHP usado para rodar o artisan via web. Sob PHP-FPM, PHP_BINARY
    // pode não ser o CLI; se o "artisan optimize:clear" falhar, defina
    // DEPLOY_PHP_BINARY com o caminho do PHP CLI (ex.: /usr/local/bin/php).
    'php_binary' => env('DEPLOY_PHP_BINARY', 'php'),
];
