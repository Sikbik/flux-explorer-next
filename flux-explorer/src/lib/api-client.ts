import ky from "ky";

// Blockbook API URL - now the primary API
const apiUrl = process.env.NEXT_PUBLIC_BLOCKBOOK_API_URL || process.env.NEXT_PUBLIC_INSIGHT_API_URL;

if (!apiUrl) {
  throw new Error("NEXT_PUBLIC_BLOCKBOOK_API_URL or NEXT_PUBLIC_INSIGHT_API_URL is not defined");
}

export const apiClient = ky.create({
  prefixUrl: apiUrl,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000, // 30 seconds
  retry: {
    limit: 2,
    methods: ["get"],
    statusCodes: [408, 413, 429, 500, 502, 503, 504],
  },
  hooks: {
    beforeError: [
      (error) => {
        const { response } = error;
        if (response && response.body) {
          error.name = "APIError";
          error.message = `${response.status}: ${response.statusText}`;
        }
        return error;
      },
    ],
  },
});
