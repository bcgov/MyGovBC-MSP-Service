// application name and version
def APP_NAME = 'msp-service'
def APP_VERSION = '1.3-prototype'

// Edit your environment TAG names below
def TAG_NAMES = ['dev', 'test', 'prod']

// You shouldn't have to edit these if you're following the conventions
// def BUILD_CONFIG = APP_NAME + '-' + APP_VERSION + '-build'
// def IMAGESTREAM_NAME = APP_NAME + '-' + APP_VERSION
def BUILD_CONFIG = 'mygovbc-msp-service'
def IMAGESTREAM_NAME = APP_NAME + '-' + APP_VERSION

node {

  stage('checkout') {
    echo "checking out github source"
    echo "Build: ${BUILD_ID}"
    checkout scm
  }

  stage('build ' + BUILD_CONFIG) {
    echo "Building: " + BUILD_CONFIG
    openshiftBuild bldCfg: BUILD_CONFIG, showBuildLogs: 'true'
    openshiftTag destStream: IMAGESTREAM_NAME, verbose: 'true', destTag: '$BUILD_ID', srcStream: IMAGESTREAM_NAME, srcTag: 'latest'
  }

  stage('deploy-' + TAG_NAMES[0]) {
    echo "Deploying to: " + TAG_NAMES[0]
    echo "tag source " + IMAGESTREAM_NAME + " with tag " + '$BUILD_ID' + " to dest " + IMAGESTREAM_NAME
    openshiftTag destStream: IMAGESTREAM_NAME, verbose: 'true', destTag: TAG_NAMES[0], srcStream: IMAGESTREAM_NAME, srcTag: '$BUILD_ID'
  }
}

node {
  stage('deploy-' + TAG_NAMES[1]) {
    input "Deploy to " + TAG_NAMES[1] + "?"
    openshiftTag destStream: IMAGESTREAM_NAME, verbose: 'true', destTag: TAG_NAMES[1], srcStream: IMAGESTREAM_NAME, srcTag: '$BUILD_ID'
  }
}

node {
  stage('deploy-'  + TAG_NAMES[2]) {
    input "Deploy to " + TAG_NAMES[2] + "?"
    openshiftTag destStream: IMAGESTREAM_NAME, verbose: 'true', destTag: TAG_NAMES[2], srcStream: IMAGESTREAM_NAME, srcTag: '$BUILD_ID'
  }
}

