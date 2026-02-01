declare module 'react-quill-new' {
    import React from 'react';
    export interface ReactQuillProps {
        value?: string;
        defaultValue?: string;
        readOnly?: boolean;
        theme?: string;
        onChange?: (content: string, delta: any, source: any, editor: any) => void;
        onChangeSelection?: (selection: any, source: any, editor: any) => void;
        modules?: any;
        formats?: string[];
        bounds?: string | HTMLElement;
        placeholder?: string;
        className?: string;
        style?: React.CSSProperties;
        preserveWhitespace?: boolean;
        tabIndex?: number;
    }
    export default class ReactQuill extends React.Component<ReactQuillProps> { }
}
