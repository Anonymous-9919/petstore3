type CookieOptions = {
  expires?: Date;
  httpOnly?: boolean;
  maxAge?: number;
  path?: string;
  sameSite?: "lax" | "strict" | "none";
  secure?: boolean;
};

export class NextResponse extends Response {
  readonly cookies = {
    set: (name: string, value: string, options: CookieOptions = {}) => {
      const parts = [`${name}=${encodeURIComponent(value)}`];
      if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`);
      if (options.expires) parts.push(`Expires=${options.expires.toUTCString()}`);
      if (options.path) parts.push(`Path=${options.path}`);
      if (options.httpOnly) parts.push("HttpOnly");
      if (options.secure) parts.push("Secure");
      if (options.sameSite) parts.push(`SameSite=${options.sameSite[0].toUpperCase()}${options.sameSite.slice(1)}`);
      this.headers.append("Set-Cookie", parts.join("; "));
    },
  };

  static json(body: unknown, init?: ResponseInit) {
    const headers = new Headers(init?.headers);
    if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    return new NextResponse(JSON.stringify(body), { ...init, headers });
  }

  static redirect(url: string | URL, status = 307) {
    return new NextResponse(null, { status, headers: { Location: String(url) } });
  }
}
