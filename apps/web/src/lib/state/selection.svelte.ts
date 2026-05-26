import { getContext, setContext } from "svelte";
import { SvelteSet } from "svelte/reactivity";
import { MessageKey } from "$lib/mail/keys";

class SelectionState {
    private selection = new SvelteSet<MessageKey.Serialized>();
    
    isSelected(key: MessageKey){
        return this.selection.has(MessageKey.serialize(key))
    }

    select(key: MessageKey) {
        const k = MessageKey.serialize(key);
        if(this.selection.has(k)) return;
        this.selection.add(k);
    }

    deselect(key: MessageKey){
        const k = MessageKey.serialize(key);
        if(!this.selection.has(k)) return;
        this.selection.delete(k);
    }

    setSelected(key: MessageKey, selected: boolean){
        if(selected) this.select(key);
        else this.deselect(key);
    }

    clear(){
        this.selection.clear();
    }

    get selected(){
        return Array.from(this.selection).map(key => MessageKey.parse(key));
    }
}

const KEY = Symbol("selection");

export function setSelectionState() {
    return setContext(KEY, new SelectionState());
}

export function getSelectionState() {
    return getContext<SelectionState>(KEY);
}
