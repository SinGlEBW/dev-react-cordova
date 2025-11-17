export const getStatusAndDataJson = (str:string) => {
  let data = null;
  try {
    data = JSON.parse(str);
  } catch (e) {
    return [false, data];
  }
  return [true, data];
};

export const convertByTypeFromDB = (value) => {
  try{
    return JSON.parse(value);
  }catch(err){
    return isNaN(Number(value)) ? value : Number(value);
  }
}

export const convertByTypeForDB = (value:any) => {
  let val: any; 
  if(typeof value === "object" || typeof value === "boolean"){
    val = JSON.stringify(value) 
  }else if(typeof value === 'string'){
    val = value.trim();
  }else{
    val = value;
  }
  return val;
}



