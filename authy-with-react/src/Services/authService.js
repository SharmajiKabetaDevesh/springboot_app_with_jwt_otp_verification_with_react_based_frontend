

import axios from 'axios';


const API_URL = 'http://localhost:8080/api/auth/';


const instance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, 
});


instance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response.status === 401 && !originalRequest._retry && originalRequest.url !== 'refreshtoken') {
      originalRequest._retry = true;
      try {
        await instance.post('refreshtoken');
        return instance(originalRequest);
      } catch (refreshError) {
       
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);


const requestOtp = (username, password) => {
  return instance.post('signin', { username, password });
};


const verifyOtpAndLogin = (username, otp) => {
  console.log({username,otp});
  return instance.post('verify-otp', { username, otp });
};

const logout = () => {
  return instance.post('signout');
};

const register = ({ username, email, password, role }) => {
  return instance.post('signup', { username, email, password, role });
};


const checkUserAuth = () => {
    return instance.get("/me");
};
const checkUsernameAvailability=(username)=>{
  return instance.get(`/checkUsername?username=${username}`);
}


const authService = {
  requestOtp,
  verifyOtpAndLogin,
  logout,
  register,
  checkUserAuth,
  checkUsernameAvailability,
};

export default authService;