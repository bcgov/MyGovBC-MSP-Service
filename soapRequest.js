
const zipCodeRequest = {
	url:  'https://graphical.weather.gov/xml/SOAP_server/ndfdXMLserver.php',
	request:`<soapenv:Envelope 
	xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
	xmlns:xsd="http://www.w3.org/2001/XMLSchema" 
	xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" 
	xmlns:ndf="https://graphical.weather.gov/xml/DWMLgen/wsdl/ndfdXML.wsdl">
	<soapenv:Header/>
	<soapenv:Body>
	<ndf:LatLonListZipCode soapenv:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
		<zipCodeList xsi:type="xsd:string">$zipcode</zipCodeList>
	</ndf:LatLonListZipCode>
	</soapenv:Body>
</soapenv:Envelope>`,
headers:{
'user-agent': 'sampleTest',
  'Content-Type': 'text/xml;charset=UTF-8',
  'soapAction': 'https://graphical.weather.gov/xml/DWMLgen/wsdl/ndfdXML.wsdl#LatLonListZipCode'}
};


function parseXml(xml) {
	var dom = null;
	if (window.DOMParser) {
		 try { 
				dom = (new DOMParser()).parseFromString(xml, "text/xml"); 
		 } 
		 catch (e) { dom = null; }
	}
	else if (window.ActiveXObject) {
		 try {
				dom = new ActiveXObject('Microsoft.XMLDOM');
				dom.async = false;
				if (!dom.loadXML(xml)) // parse error ..

					 window.alert(dom.parseError.reason + dom.parseError.srcText);
		 } 
		 catch (e) { dom = null; }
	}
	else
		 alert("cannot parse xml string!");
	return dom;
}

module.exports ={zip:zipCodeRequest, parseXml};