import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

const getHeaders = () => {
  const token = localStorage.getItem('authToken');
  return {
    headers: {
      Authorization: `Bearer ${token || ''}`,
      Accept: 'application/json',
    },
  };
};

export const extractReport = async (formData) => {
  const response = await axios.post(
    `${API_BASE_URL}/api/report-analysis/extract`,
    formData,
    {
      ...getHeaders(),
      headers: {
        ...getHeaders().headers,
        'Content-Type': 'multipart/form-data',
      },
    }
  );

  return response.data;
};

export default { extractReport };

