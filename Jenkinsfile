// Pipeline de testes do auto-RDO.
// Backend e frontend são projetos independentes, então rodam em paralelo.

// O mesmo Jenkinsfile funciona em agente Linux (sh) e Windows (bat).
def run(String comando) {
    if (isUnix()) {
        sh comando
    } else {
        bat comando
    }
}

pipeline {
    agent any

    // Nome definido em "Manage Jenkins → Tools → NodeJS installations"
    tools {
        nodejs 'node-24'
    }

    options {
        timeout(time: 15, unit: 'MINUTES')
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '20'))
        timestamps()
    }

    // Jenkins local não recebe webhook do GitHub; então ele pergunta ao GitHub a cada ~5 min
    triggers {
        pollSCM('H/5 * * * *')
    }

    environment {
        CI = 'true'
    }

    stages {
        stage('Testes') {
            parallel {
                stage('Backend') {
                    stages {
                        stage('Backend: instalar') {
                            steps { dir('backend') { run 'npm ci' } }
                        }
                        stage('Backend: testes') {
                            steps { dir('backend') { run 'npm run test:ci' } }
                        }
                    }
                }

                stage('Frontend') {
                    stages {
                        stage('Frontend: instalar') {
                            steps { dir('frontend') { run 'npm ci' } }
                        }
                        stage('Frontend: lint') {
                            steps { dir('frontend') { run 'npm run lint' } }
                        }
                        stage('Frontend: testes') {
                            steps { dir('frontend') { run 'npm run test:ci' } }
                        }
                        // Pega import quebrado/erro de sintaxe que os testes não cobrem
                        stage('Frontend: build') {
                            steps { dir('frontend') { run 'npm run build' } }
                        }
                    }
                }
            }
        }
    }

    post {
        always {
            // Publica os relatórios mesmo quando um teste falha — é justamente quando mais importam
            junit allowEmptyResults: true, testResults: '**/test-results/junit.xml'
        }
        success {
            echo 'Pipeline verde: backend e frontend aprovados.'
        }
        failure {
            echo 'Pipeline vermelha: veja a aba "Tests" ou o log do estágio que falhou.'
        }
    }
}
