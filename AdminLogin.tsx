import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "./firebase";

const provider = new GoogleAuthProvider();

function AdminLogin() {

  const login = async () => {
    try {
      const result = await signInWithPopup(auth, provider);

      const email = result.user.email;

      if (email === "gamblerop18@gmail.com") {
        alert("Admin Login Successful");
        window.location.href = "/admin";
      } else {
        alert("Access Denied");
      }

    } catch (error) {
      console.log(error);
    }
  };


  return (
    <div>
      <h2>Admin Login</h2>

      <button onClick={login}>
        Login with Google
      </button>

    </div>
  );
}

export default AdminLogin;