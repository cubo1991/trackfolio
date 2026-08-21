import { ApiError, api } from "@/lib/api";
import type { Application } from "@/lib/types";
import { groupByStatus, useBoardStore } from "@/stores/board";

// Se reemplaza el módulo de la API entero. El store no debería saber si del otro lado hay una
// red: lo único que importa es qué hace cuando la promesa resuelve y qué hace cuando falla.
// Ese "cuando falla" es imposible de provocar a mano contra un servidor que anda bien.
jest.mock("@/lib/api", () => ({
  ...jest.requireActual("@/lib/api"),
  api: {
    listApplications: jest.fn(),
    updateApplication: jest.fn(),
    createApplication: jest.fn(),
    deleteApplication: jest.fn(),
  },
}));

const mockedApi = api as jest.Mocked<typeof api>;

function unaPostulacion(overrides: Partial<Application> = {}): Application {
  return {
    id: 1,
    user_id: 1,
    company: "ACME",
    position: "Backend Developer",
    applied_date: "2026-01-15",
    status: "applied",
    url: null,
    notes: null,
    tags: ["python"],
    created_at: "2026-01-15T00:00:00Z",
    updated_at: "2026-01-15T00:00:00Z",
    ...overrides,
  };
}

/** El store es un singleton: sin esto, cada test heredaría el estado del anterior. */
const estadoInicial = useBoardStore.getState();
beforeEach(() => {
  jest.clearAllMocks();
  useBoardStore.setState(estadoInicial, true);
});

describe("load", () => {
  it("trae las postulaciones y las deja en el estado", async () => {
    mockedApi.listApplications.mockResolvedValue([unaPostulacion()]);

    await useBoardStore.getState().load();

    expect(useBoardStore.getState().applications).toHaveLength(1);
    expect(useBoardStore.getState().loading).toBe(false);
  });

  it("le pasa a la API los filtros activos", async () => {
    mockedApi.listApplications.mockResolvedValue([]);
    useBoardStore.setState({ filters: { company: "acme", status: "interview" } });

    await useBoardStore.getState().load();

    expect(mockedApi.listApplications).toHaveBeenCalledWith({
      company: "acme",
      status: "interview",
    });
  });

  it("deja un mensaje de error y apaga el loading si la API falla", async () => {
    mockedApi.listApplications.mockRejectedValue(new ApiError(500, "Se cayó el servidor."));

    await useBoardStore.getState().load();

    expect(useBoardStore.getState().error).toBe("Se cayó el servidor.");
    expect(useBoardStore.getState().loading).toBe(false);
  });
});

describe("move", () => {
  beforeEach(() => {
    useBoardStore.setState({ applications: [unaPostulacion()] });
  });

  it("mueve la tarjeta antes de que responda el servidor", async () => {
    // La promesa se deja pendiente a propósito: es la única forma de observar el estado
    // intermedio. Si el store esperara la respuesta, acá la tarjeta seguiría en "applied"
    // y el tablero se sentiría trabado en cada arrastre.
    let responder: (application: Application) => void;
    mockedApi.updateApplication.mockReturnValue(
      new Promise((resolve) => {
        responder = resolve;
      }),
    );

    const enCurso = useBoardStore.getState().move(1, "interview");

    expect(useBoardStore.getState().applications[0].status).toBe("interview");

    responder!(unaPostulacion({ status: "interview" }));
    await enCurso;
  });

  it("se queda con lo que devuelve el servidor cuando sale bien", async () => {
    mockedApi.updateApplication.mockResolvedValue(
      unaPostulacion({ status: "interview", updated_at: "2026-08-21T10:00:00Z" }),
    );

    await useBoardStore.getState().move(1, "interview");

    expect(useBoardStore.getState().applications[0].status).toBe("interview");
    // No alcanza con que el estado coincida: el servidor manda campos que el cliente no puede
    // calcular, como updated_at. Si el store se quedara con su versión optimista, se perderían.
    expect(useBoardStore.getState().applications[0].updated_at).toBe("2026-08-21T10:00:00Z");
  });

  it("devuelve la tarjeta a su columna si el servidor rechaza el cambio", async () => {
    // El test más importante del frontend: sin rollback la interfaz muestra un estado que la
    // base no tiene, y el usuario cree que guardó algo que se perdió.
    mockedApi.updateApplication.mockRejectedValue(new ApiError(422, "Estado inválido."));

    await useBoardStore.getState().move(1, "offer");

    expect(useBoardStore.getState().applications[0].status).toBe("applied");
    expect(useBoardStore.getState().error).toBe("Estado inválido.");
  });

  it("restaura la tarjeta completa, no solo el estado", async () => {
    useBoardStore.setState({ applications: [unaPostulacion({ notes: "Contacto: Ana" })] });
    mockedApi.updateApplication.mockRejectedValue(new ApiError(500, "Error."));

    await useBoardStore.getState().move(1, "offer");

    expect(useBoardStore.getState().applications[0].notes).toBe("Contacto: Ana");
  });

  it("no llama a la API si la tarjeta se suelta en su propia columna", async () => {
    await useBoardStore.getState().move(1, "applied");

    expect(mockedApi.updateApplication).not.toHaveBeenCalled();
  });

  it("no hace nada si la tarjeta no existe", async () => {
    await useBoardStore.getState().move(999, "interview");

    expect(mockedApi.updateApplication).not.toHaveBeenCalled();
    expect(useBoardStore.getState().error).toBeNull();
  });
});

describe("removeApplication", () => {
  beforeEach(() => {
    useBoardStore.setState({ applications: [unaPostulacion(), unaPostulacion({ id: 2 })] });
  });

  it("saca la tarjeta de la lista", async () => {
    mockedApi.deleteApplication.mockResolvedValue(undefined);

    await useBoardStore.getState().removeApplication(1);

    expect(useBoardStore.getState().applications.map((a) => a.id)).toEqual([2]);
  });

  it("la devuelve a la lista si el borrado falla", async () => {
    mockedApi.deleteApplication.mockRejectedValue(new ApiError(404, "No encontrada."));

    await useBoardStore.getState().removeApplication(1);

    expect(useBoardStore.getState().applications.map((a) => a.id)).toEqual([1, 2]);
    expect(useBoardStore.getState().error).toBe("No encontrada.");
  });
});

describe("filtros", () => {
  it("setFilter conserva los filtros que ya estaban", () => {
    useBoardStore.getState().setFilter("company", "acme");
    useBoardStore.getState().setFilter("tag", "python");

    expect(useBoardStore.getState().filters).toEqual({ company: "acme", tag: "python" });
  });

  it("clearFilters los borra todos", () => {
    useBoardStore.getState().setFilter("company", "acme");
    useBoardStore.getState().clearFilters();

    expect(useBoardStore.getState().filters).toEqual({});
  });
});

describe("groupByStatus", () => {
  it("agrupa por estado conservando el orden dentro de cada grupo", () => {
    const grupos = groupByStatus([
      unaPostulacion({ id: 1, status: "applied" }),
      unaPostulacion({ id: 2, status: "interview" }),
      unaPostulacion({ id: 3, status: "applied" }),
    ]);

    expect(grupos.applied.map((a) => a.id)).toEqual([1, 3]);
    expect(grupos.interview.map((a) => a.id)).toEqual([2]);
  });

  it("no devuelve clave para los estados sin postulaciones", () => {
    // El tablero hace `grupos[status] ?? []`, así que la ausencia tiene que ser undefined
    // y no romper.
    expect(groupByStatus([]).offer).toBeUndefined();
  });
});
