node('master') {
	 
    stage('checkout') {
       echo "checking out source"
       echo "Build: ${BUILD_ID}"
       checkout scm
    }
	 
	stage('build') {
	 echo "Building..."
	 openshiftBuild bldCfg: 'mygovbc-msp-service', showBuildLogs: 'true'
	 openshiftTag destStream: 'mygovbc-msp-service', verbose: 'true', destTag: '$BUILD_ID', srcStream: 'mygovbc-msp-service', srcTag: 'latest'
	 openshiftTag destStream: 'mygovbc-msp-service', verbose: 'true', destTag: 'dev', srcStream: 'mygovbc-msp-service', srcTag: 'latest'
    }
	
}


stage('deploy-test') {
  input "Deploy to test?"
  
  node('master'){
     openshiftTag destStream: 'mygovbc-msp-service', verbose: 'true', destTag: 'test', srcStream: 'mygovbc-msp-service', srcTag: '$BUILD_ID'
  }
}

stage('deploy-prod') {
  input "Deploy to prod?"
  node('master'){
     openshiftTag destStream: 'mygovbc-msp-service', verbose: 'true', destTag: 'prod', srcStream: 'mygovbc-msp-service', srcTag: '$BUILD_ID'
  }
  
}

