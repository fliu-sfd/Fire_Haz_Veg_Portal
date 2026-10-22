import useSWR from "swr";
import { authErrorMessage, getCurrentAccount, type Account } from "@/features/auth/api";

export const CURRENT_ACCOUNT_KEY = "auth/me";

type CurrentAccount = {
  account: Account | undefined;
  error: unknown;
  errorMessage: string | undefined;
  isLoading: boolean;
};

/** Shares one /auth/me request between the shell, guards and pages. */
export function useCurrentAccount(): CurrentAccount {
  const { data, error, isLoading } = useSWR(CURRENT_ACCOUNT_KEY, getCurrentAccount);
  return {
    account: data,
    error,
    errorMessage: error ? authErrorMessage(error) : undefined,
    isLoading,
  };
}
