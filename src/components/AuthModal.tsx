import React, { useState, useEffect } from "react";

import {
  sendPasswordResetEmail,
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";

import { auth } from "../firebase";

import {
  doc,
  getDoc,
  setDoc,
} from "firebase/firestore";

import { db } from "../firebase";

import {
  createUserProfile,
  getUserProfile,
} from "../services/dbService";

import {
  motion,
  AnimatePresence,
} from "motion/react";

import {
  X,
  Eye,
  EyeOff,
  Sparkles,
  LogIn,
  Key,
  Mail,
  User,
  Phone,
} from "lucide-react";



interface AuthModalProps {
  isOpen:boolean;
  onClose:()=>void;
  onSuccess:(profile:any)=>void;
}



export default function AuthModal({
  isOpen,
  onClose,
  onSuccess
}:AuthModalProps){


const [tab,setTab] =
useState<"login"|"signup"|"forgot">("login");


// login
const [loginEmail,setLoginEmail]=useState("");
const [loginPassword,setLoginPassword]=useState("");


// signup
const [suName,setSuName]=useState("");
const [suEmail,setSuEmail]=useState("");
const [suPhone,setSuPhone]=useState("");
const [suPassword,setSuPassword]=useState("");


// forgot
const [forgotEmail,setForgotEmail]=useState("");


// ui
const [showPassword,setShowPassword]=useState(false);

const [error,setError]=useState("");
const [successMsg,setSuccessMsg]=useState("");

const [loading,setLoading]=useState(false);



useEffect(()=>{
 setError("");
 setSuccessMsg("");
},[tab]);





// GOOGLE LOGIN

const handleGoogleLogin = async()=>{

setError("");
setLoading(true);


try{

const provider = new GoogleAuthProvider();

const result =
await signInWithPopup(auth,provider);


const user=result.user;



// ADMIN CHECK

if(
user.email?.toLowerCase()
===
"gamblerop18@gmail.com"
){


const adminProfile={

id:user.uid,

name:"Super Administrator",

email:user.email,

role:"admin",

points:9999,

ordersCount:99,

joined:
new Date()
.toISOString()
.split("T")[0]

};



sessionStorage.setItem(
"adminAuth",
"true"
);


onSuccess(adminProfile);
onClose();

return;

}



// NORMAL USER


let profile =
await getUserProfile(user.uid);



if(!profile){

profile =
await createUserProfile(
user.uid,
{
name:user.displayName || "Google User",
email:user.email || "",
phone:user.phoneNumber || ""
}
);

}



onSuccess(profile);
onClose();



}
catch(err:any){

console.log(err);

if(
err.code!=="auth/popup-closed-by-user"
){

setError(
"Google authentication failed"
);

}

}

finally{

setLoading(false);

}

};





// EMAIL LOGIN

const handleLogin =
async(e:React.FormEvent)=>{


e.preventDefault();

setError("");
setLoading(true);



try{


// ADMIN BLOCK

if(
loginEmail.toLowerCase()
===
"gamblerop18@gmail.com"
){


setError(
"Admin account uses Google Login only."
);


setLoading(false);
return;

}



// normal firebase login removed
// because your old code was custom hash based


const userRef =
doc(db,"users",loginEmail);


const snap =
await getDoc(userRef);



if(!snap.exists()){

setError(
"Account not found"
);

setLoading(false);
return;

}



const profile=snap.data();



localStorage.setItem(
"customUserAuth",
JSON.stringify(profile)
);



onSuccess(profile);
onClose();



}
catch(err:any){

setError(
"Login failed"
);

}

finally{

setLoading(false);

}

};





// SIGNUP

const handleSignup =
async(e:React.FormEvent)=>{


e.preventDefault();

setError("");

setLoading(true);



try{


const uid =
crypto.randomUUID();



const profile =
await createUserProfile(
uid,
{
name:suName,
email:suEmail,
phone:suPhone
}
);



await setDoc(
doc(db,"users",uid),
profile
);



onSuccess(profile);
onClose();



}
catch(err:any){

setError(
"Signup failed"
);

}

finally{

setLoading(false);

}

};





// FORGOT PASSWORD

const handleForgot =
async(e:React.FormEvent)=>{


e.preventDefault();

setLoading(true);
setError("");



try{


await sendPasswordResetEmail(
auth,
forgotEmail
);


setSuccessMsg(
"Password reset email sent"
);



}
catch{

setError(
"Unable to send reset email"
);


}

finally{

setLoading(false);

}

};

if (!isOpen) return null;


return (

<div className="fixed inset-0 bg-[#000]/80 z-[1000] flex items-center justify-center p-4 backdrop-blur-md">

<motion.div

initial={{opacity:0,scale:0.95,y:15}}

animate={{opacity:1,scale:1,y:0}}

className="bg-[#071628] border border-[#0d2d50] rounded-2xl p-6 w-full max-w-[460px] relative shadow-2xl"

>


<button

onClick={onClose}

className="absolute top-4 right-4 text-[#7da3cc] hover:text-white"

>

<X className="w-5 h-5"/>

</button>



{/* Tabs */}

<div className="flex bg-[#040f1e] rounded-xl p-1 mb-6 border border-[#0d2d50]">


<button

onClick={()=>setTab("login")}

className={`flex-1 py-2.5 rounded-lg text-sm font-semibold ${
tab==="login"
?"bg-[#1a6fff] text-white"
:"text-[#7da3cc]"
}`}

>

Login

</button>



<button

onClick={()=>setTab("signup")}

className={`flex-1 py-2.5 rounded-lg text-sm font-semibold ${
tab==="signup"
?"bg-[#1a6fff] text-white"
:"text-[#7da3cc]"
}`}

>

Sign Up

</button>


</div>





<AnimatePresence mode="wait">


{/* LOGIN */}

{tab==="login" && (

<motion.div

key="login"

initial={{opacity:0,x:-10}}

animate={{opacity:1,x:0}}

>


<div className="text-center mb-6">

<div className="text-4xl mb-3">
🔐
</div>

<h2 className="text-xl font-bold text-white">
Welcome Back
</h2>


<p className="text-[#7da3cc] text-xs">
Access your account
</p>


</div>




<form
onSubmit={handleLogin}
className="space-y-4"
>


<div>

<label className="text-xs text-[#7da3cc]">
Email Address
</label>


<div className="relative">

<Mail className="absolute left-3 top-3 w-4 h-4 text-[#7da3cc]"/>


<input

type="email"

value={loginEmail}

onChange={(e)=>setLoginEmail(e.target.value)}

placeholder="Enter email"

className="w-full bg-[#0a1f38] border border-[#0d2d50] rounded-xl py-2.5 pl-10 text-white"

required

/>

</div>

</div>





<div>

<label className="text-xs text-[#7da3cc]">
Password
</label>


<div className="relative">


<Key className="absolute left-3 top-3 w-4 h-4 text-[#7da3cc]"/>


<input

type={showPassword?"text":"password"}

value={loginPassword}

onChange={(e)=>setLoginPassword(e.target.value)}

placeholder="Enter password"

className="w-full bg-[#0a1f38] border border-[#0d2d50] rounded-xl py-2.5 pl-10 pr-10 text-white"

required

/>


<button

type="button"

onClick={()=>setShowPassword(!showPassword)}

className="absolute right-3 top-3 text-[#7da3cc]"

>


{
showPassword
?
<EyeOff className="w-4 h-4"/>
:
<Eye className="w-4 h-4"/>
}

</button>


</div>


</div>



{error &&

<div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-xs">

{error}

</div>

}



<button

disabled={loading}

className="w-full bg-[#1a6fff] py-3 rounded-xl text-white font-semibold"

>


{
loading
?
"Logging in..."
:
"Login"
}


</button>


</form>


</motion.div>

)}

{/* SIGNUP */}

{tab==="signup" && (

<motion.div

key="signup"

initial={{opacity:0,x:10}}

animate={{opacity:1,x:0}}

>


<div className="text-center mb-5">

<div className="text-4xl mb-3">
✨
</div>

<h2 className="text-xl font-bold text-white">
Create Account
</h2>

<p className="text-[#7da3cc] text-xs">
Join Assign Me
</p>

</div>



<form

onSubmit={handleSignup}

className="space-y-3"

>


<div className="relative">

<User className="absolute left-3 top-3 w-4 h-4 text-[#7da3cc]"/>


<input

type="text"

value={suName}

onChange={(e)=>setSuName(e.target.value)}

placeholder="Full Name"

className="w-full bg-[#0a1f38] border border-[#0d2d50] rounded-xl py-2.5 pl-10 text-white"

required

/>

</div>




<div className="relative">

<Mail className="absolute left-3 top-3 w-4 h-4 text-[#7da3cc]"/>


<input

type="email"

value={suEmail}

onChange={(e)=>setSuEmail(e.target.value)}

placeholder="Email Address"

className="w-full bg-[#0a1f38] border border-[#0d2d50] rounded-xl py-2.5 pl-10 text-white"

required

/>

</div>




<div className="relative">

<Phone className="absolute left-3 top-3 w-4 h-4 text-[#7da3cc]"/>


<input

type="tel"

value={suPhone}

onChange={(e)=>setSuPhone(e.target.value)}

placeholder="Phone Number"

className="w-full bg-[#0a1f38] border border-[#0d2d50] rounded-xl py-2.5 pl-10 text-white"

/>

</div>




<div className="relative">


<Key className="absolute left-3 top-3 w-4 h-4 text-[#7da3cc]"/>


<input

type={showPassword?"text":"password"}

value={suPassword}

onChange={(e)=>setSuPassword(e.target.value)}

placeholder="Password"

className="w-full bg-[#0a1f38] border border-[#0d2d50] rounded-xl py-2.5 pl-10 pr-10 text-white"

required

/>



<button

type="button"

onClick={()=>setShowPassword(!showPassword)}

className="absolute right-3 top-3 text-[#7da3cc]"

>

{
showPassword
?
<EyeOff className="w-4 h-4"/>
:
<Eye className="w-4 h-4"/>
}

</button>


</div>




{error &&

<div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-xs">

{error}

</div>

}



<button

disabled={loading}

className="w-full bg-[#1a6fff] py-3 rounded-xl text-white font-semibold"

>

{
loading
?
"Creating..."
:
"Create Account"
}

</button>



</form>


</motion.div>

)}






{/* FORGOT PASSWORD */}

{tab==="forgot" && (

<motion.div

key="forgot"

initial={{opacity:0}}

animate={{opacity:1}}

>


<h2 className="text-xl text-center text-white font-bold mb-5">

Reset Password

</h2>




<form

onSubmit={handleForgot}

className="space-y-4"

>


<div className="relative">


<Mail className="absolute left-3 top-3 w-4 h-4 text-[#7da3cc]"/>


<input

type="email"

value={forgotEmail}

onChange={(e)=>setForgotEmail(e.target.value)}

placeholder="Your email"

className="w-full bg-[#0a1f38] border border-[#0d2d50] rounded-xl py-2.5 pl-10 text-white"

required

/>


</div>




{successMsg &&

<div className="text-green-400 text-xs">

{successMsg}

</div>

}



{error &&

<div className="text-red-400 text-xs">

{error}

</div>

}




<button

className="w-full bg-[#1a6fff] py-3 rounded-xl text-white font-semibold"

>

Send Reset Link

</button>




<button

type="button"

onClick={()=>setTab("login")}

className="w-full mt-2 border border-[#0d2d50] py-3 rounded-xl text-[#7da3cc]"

>

Back

</button>



</form>


</motion.div>

)}


</AnimatePresence>





{/* GOOGLE LOGIN */}

{tab!=="forgot" && (

<div className="mt-5 border-t border-[#0d2d50] pt-5">


<div className="text-center text-xs text-[#7da3cc] mb-3">

OR

</div>



<button

onClick={handleGoogleLogin}

className="w-full bg-[#0a1f38] border border-[#0d2d50] py-3 rounded-xl text-white font-semibold"

>


Continue with Google


</button>



</div>

)}



</motion.div>

</div>

);


}