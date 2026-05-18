import { untrack } from "svelte";

type State = "idle" | "loading" | "success" | "error";

class LoaderState {
	private count = $state(0);
	private status = $state<Exclude<State, "loading">>("idle");
	private errorTimer: ReturnType<typeof setTimeout> | undefined;

	readonly state: State = $derived(
		this.count > 0 ? "loading" : this.status,
	);

	track<T>(promise: Promise<T>): Promise<T> {
		untrack(() => {
			this.count++;
			if (this.status === "success") this.status = "idle";
		});
		return promise.then(
			(v) => {
				this.count--;
				if (this.count === 0 && this.status !== "error") {
					this.status = "success";
				}
				return v;
			},
			(e) => {
				this.count--;
				this.status = "error";
				clearTimeout(this.errorTimer);
				this.errorTimer = setTimeout(() => {
					this.status = "idle";
				}, 1000);
				throw e;
			},
		);
	}

	reset() {
		this.status = "idle";
	}
}

export const loader = new LoaderState();
