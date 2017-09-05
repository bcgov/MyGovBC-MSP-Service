node('master') {
    stage('checkout') {
       echo "checking out source"
       echo "Build: ${BUILD_ID}"
       checkout scm
    }
	 
	stage('build') {
	 echo "Building..."
	 openshiftBuild bldCfg: "msp-service", showBuildLogs: 'true'
	 openshiftTag destStream: "msp-service", verbose: 'true', destTag: '$BUILD_ID', srcStream: "msp-service", srcTag: 'latest'
	 openshiftTag destStream: "msp-service", verbose: 'true', destTag: 'dev', srcStream: "msp-service", srcTag: 'latest'
    }
}


stage('deploy-test') {
  input "Deploy to test?"
  
  node('master'){
     openshiftTag destStream: 'msp-service', verbose: 'true', destTag: 'test', srcStream: 'msp-service', srcTag: '$BUILD_ID'
  }
}

stage('deploy-prod') {
  input "Deploy to prod?"
  node('master'){
     openshiftTag destStream: 'msp-service', verbose: 'true', destTag: 'prod', srcStream: 'msp-service', srcTag: '$BUILD_ID'
  }
  
}

