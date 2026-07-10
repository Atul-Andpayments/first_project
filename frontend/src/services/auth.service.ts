import api from "./api";

export interface RegisterDto {
  name: string;
  phone: string;
  email: string;
  password: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export const registerMerchant = async (data: RegisterDto) => {
  const response = await api.post("/auth/signup", data);

  return response.data;
};

export const loginMerchant = async (data: LoginDto) => {
  const response = await api.post("/auth/login", data);

  return response.data;
};

export const getCurrentMerchant = async () => {
  const response = await api.get("/merchant/me");

  return response.data;
};

export const logoutMerchant = async () => {
  const response = await api.post("/auth/logout");

  return response.data;
};
