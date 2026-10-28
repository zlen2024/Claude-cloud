// Editor netlist berasaskan CodeMirror 6 dengan highlight SPICE dan garis bawah diagnostik.
import { EditorState } from "@codemirror/state";
import { EditorView, keymap, lineNumbers, highlightActiveLine, drawSelection } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { StreamLanguage, syntaxHighlighting, HighlightStyle, indentOnInput, bracketMatching } from "@codemirror/language";
import { setDiagnostics, lintGutter } from "@codemirror/lint";
import { tags as t } from "@lezer/highlight";
import { t as tr } from "./i18n/index.js";

const NUM = /^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?(meg|[tgkmunpf])?(?![a-z_])/i;

/** Bahasa SPICE: komen *, arahan dot, huruf elemen, nombor dengan akhiran SI, model SKY130, kunci=nilai. */
export const spiceLanguage = StreamLanguage.define({
  name: "spice",
  startState: () => ({}),
  token(stream) {
    if (stream.sol()) {
      if (stream.match(/^\*.*/)) return "comment";
      if (stream.match(/^\s*\.\w+/)) return "keyword";
      if (stream.match(/^\s*[a-z]\w*/i)) return "typeName";
    }
    if (stream.eatSpace()) return null;
    if (stream.match(/^;.*/)) return "comment";
    if (stream.match(/^sky130_fd_pr__\w+/i)) return "atom";
    if (stream.match(/^\w+(?==)/)) return "propertyName";
    if (stream.match(NUM)) return "number";
    if (stream.match(/^[\w.#$:-]+(\([^)]*\))?/)) return "variableName";
    stream.next();
    return null;
  },
  tokenTable: {
    comment: t.lineComment,
    keyword: t.keyword,
    typeName: t.typeName,
    atom: t.atom,
    propertyName: t.propertyName,
    number: t.number,
    variableName: t.variableName,
  },
});

const highlight = HighlightStyle.define([
  { tag: t.lineComment, color: "var(--hl-comment)", fontStyle: "italic" },
  { tag: t.keyword, color: "var(--hl-keyword)" },
  { tag: t.typeName, color: "var(--hl-type)" },
  { tag: t.atom, color: "var(--hl-atom)" },
  { tag: t.propertyName, color: "var(--hl-prop)" },
  { tag: t.number, color: "var(--hl-number)" },
  { tag: t.variableName, color: "var(--text)" },
]);

const theme = EditorView.theme(
  {
    "&": { height: "100%", backgroundColor: "var(--surface)", color: "var(--text-strong)", fontSize: "13px" },
    ".cm-scroller": { fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace", lineHeight: "1.55" },
    ".cm-gutters": { backgroundColor: "var(--surface)", color: "var(--muted)", border: "none" },
    ".cm-activeLine": { backgroundColor: "rgba(90,169,255,0.06)" },
    ".cm-activeLineGutter": { backgroundColor: "transparent", color: "#8b93a1" },
    "&.cm-focused": { outline: "2px solid var(--accent)" },
    ".cm-cursor": { borderLeftColor: "var(--text-strong)" },
    ".cm-selectionBackground, &.cm-focused .cm-selectionBackground": { backgroundColor: "rgba(90,169,255,0.28)" },
    ".cm-tooltip": { backgroundColor: "#151a23", border: "1px solid #262d3a", color: "var(--text)" },
  },
  {},
);

export function createEditor(parent, { doc = "", onChange, onRun } = {}) {
  const view = new EditorView({
    parent,
    state: EditorState.create({
      doc,
      extensions: [
        lineNumbers(),
        lintGutter(),
        history(),
        drawSelection(),
        highlightActiveLine(),
        indentOnInput(),
        bracketMatching(),
        spiceLanguage,
        syntaxHighlighting(highlight),
        theme,
        keymap.of([
          { key: "Mod-Enter", run: () => (onRun?.(), true) },
          ...defaultKeymap,
          ...historyKeymap,
          indentWithTab,
        ]),
        EditorView.contentAttributes.of({ "aria-label": tr("editor.aria"), spellcheck: "false" }),
        EditorView.updateListener.of((u) => u.docChanged && onChange?.(u)),
      ],
    }),
  });

  return {
    view,
    getValue: () => view.state.doc.toString(),
    setValue(text) {
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: text } });
    },
    /** diags: [{line (bermula 1), message, severity}]. Baris di luar julat diabaikan. */
    setDiagnostics(diags) {
      const doc = view.state.doc;
      const mapped = diags
        .filter((d) => d.line >= 1 && d.line <= doc.lines)
        .map((d) => {
          const l = doc.line(d.line);
          return { from: l.from, to: Math.max(l.to, Math.min(l.from + 1, doc.length)), severity: d.severity, message: d.message };
        });
      view.dispatch(setDiagnostics(view.state, mapped));
    },
    focus: () => view.focus(),
  };
}
