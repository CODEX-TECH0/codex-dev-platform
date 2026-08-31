export const emailError=(email:string)=>/^\S+@\S+\.\S+$/.test(email)?'':'Enter a valid email address.';
export const passwordError=(value:string)=>value.length>=8&&/[A-Z]/.test(value)&&/\d/.test(value)?'':'Use 8+ characters including a capital letter and number.';
export const projectError=(name:string)=>name.trim().length>=2?'':'Project name must contain at least 2 characters.';
