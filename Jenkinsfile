node('master') {
	APPLICATION_NAME = "msp-service"
    stage('checkout') {
       echo "checking out source"
       echo "Build: ${BUILD_ID}"
       checkout scm
    }
	 
	stage('build') {
	 echo "Building..."
	 openshiftBuild bldCfg: '${APPLICATION_NAME}', showBuildLogs: 'true'
	 openshiftTag destStream: '${APPLICATION_NAME}', verbose: 'true', destTag: '$BUILD_ID', srcStream: '${APPLICATION_NAME}', srcTag: 'latest'
	 openshiftTag destStream: '${APPLICATION_NAME}', verbose: 'true', destTag: 'dev', srcStream: '${APPLICATION_NAME}', srcTag: 'latest'
    }
	
}


stage('deploy-test') {
  input "Deploy to test?"
  
  node('master'){
     openshiftTag destStream: '${APPLICATION_NAME}', verbose: 'true', destTag: 'test', srcStream: '${APPLICATION_NAME}', srcTag: '$BUILD_ID'
  }
}

stage('deploy-prod') {
  input "Deploy to prod?"
  node('master'){
     openshiftTag destStream: '${APPLICATION_NAME}', verbose: 'true', destTag: 'prod', srcStream: '${APPLICATION_NAME}', srcTag: '$BUILD_ID'
  }
  
}

