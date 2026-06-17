import { render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { SwaggerUiViewer } from "@/app/docs/api/swagger-ui-viewer";

describe("SwaggerUiViewer", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete window.SwaggerUIBundle;
  });

  test("initializes Swagger UI only after the bundle script loads", async () => {
    const appendChildSpy = vi.spyOn(document.body, "appendChild");
    const swaggerUiBundle = vi.fn();

    render(<SwaggerUiViewer />);

    const script = await waitFor(() => {
      expect(appendChildSpy).toHaveBeenCalled();
      const appendedScript = appendChildSpy.mock.calls
        .map(([node]) => node)
        .find((node): node is HTMLScriptElement => node instanceof HTMLScriptElement);

      if (appendedScript === undefined) {
        throw new Error("Swagger UI script was not appended");
      }

      return appendedScript;
    });

    expect(swaggerUiBundle).not.toHaveBeenCalled();

    Object.defineProperty(window, "SwaggerUIBundle", {
      configurable: true,
      value: swaggerUiBundle,
    });

    script.dispatchEvent(new Event("load"));

    expect(swaggerUiBundle).toHaveBeenCalledWith({
      url: "/api/openapi.json",
      dom_id: "#swagger-ui",
    });
  });
});
