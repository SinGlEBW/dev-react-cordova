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



export const getLocalDateTime = (): string => {
  const date = new Date();
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
};