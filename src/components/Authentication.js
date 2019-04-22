//import KJUR, {KEYUTIL} from 'jsrsasign';
import config from '../globalConfiguration.json';


export async function createToken(username,password){
    const types = {
    error: "errorClass",
    info: "infoClass",
    debug: "debugClass",
    warning: "warningClass"
  };
    const tokenUrl = config.authorization_service.auth_token_url;
    console.log("Retrieving OAuth token from "+tokenUrl,types.info);
    let params = {
        grant_type:"password",
        username:username,
        password:password,
        client_id:config.provider.client_id
      };
    if(config.provider.client_id){
    console.log("Using client {" + config.provider.client_id + "}",types.info)
    }else{
    console.log("No client id provided in GlobalConfiguration",this.warning);
    }

    // Encodes the params to be compliant with
    // x-www-form-urlencoded content types.
    const searchParams = Object.keys(params).map((key) => {
        return encodeURIComponent(key) + '=' + encodeURIComponent(params[key]);
    }).join('&');
    // We get the token from the url
    const tokenResponse =  await fetch(tokenUrl, {
        method: "POST",
        headers: {
            "Content-Type":"application/x-www-form-urlencoded"
          },
        body: searchParams
    })
    .then((response) =>{
        return response.json();
    })
    .then((response)=>{
        const token = response?response.access_token:null;
        if(token){
        console.log("Successfully retrieved token",types.info);
        }else{
        console.log("Failed to get token",types.warning);
        if(response.error_description){
            console.log(response.error_description,types.error);
        }
        }
        return token;

    })
    .catch(reason =>{
    console.log("Failed to get token", types.error);
    console.log("Bad request");
    });
//    let t = await tokenResponse
    // console.log("tokenResponse:",t)
    return tokenResponse;

}