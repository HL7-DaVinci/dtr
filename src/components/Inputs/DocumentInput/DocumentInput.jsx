import React, { Component } from 'react';

import './DocumentInput.css';
// import '../../ComponentStyles.css';
import Dropzone from 'react-dropzone';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCloudUploadAlt } from '@fortawesome/free-solid-svg-icons';

export default class DocumentInput extends Component {
    constructor(props) {
        super(props);
        this.state = {
            files: []
        };
        this.indexOfFile = this.indexOfFile.bind(this);

    }
    
    indexOfFile(file) {
        for (var i = 0; i < this.state.files.length; i++) {
            console.log(this.state.files[i].name, file.name, 'lets check')
            if (this.state.files[i].name === file.name) {
                return i;
            }
        }
        return -1;
    }

    onDrop(files) {

        let new_files = [];

        new_files = this.state.files;
        // new_files.concat(this.state.files);
        // let old_files= this.state.files;
        for (var i = 0; i < files.length; i++) {
            console.log(files[i], 'what file', JSON.stringify(this.state.files).indexOf(JSON.stringify(files[i])), this.state.files)
            if (this.indexOfFile(files[i]) === - 1) {
                console.log(this.indexOfFile(files[i]), i)
                new_files = this.state.files.concat(files);
            }
        }
        // if( this.state.files.every((value, index) => value !== files[index])){
        //     new_files= this.state.files.concat(files);
        //     console.log('includes')
        // }
        this.setState({ files: new_files });
        this.props.updateCallback('files',this.state.files)
    }
    onCancel(file) {
        let new_files = this.state.files;
        for (var i = 0; i < new_files.length; i++) {
            if (new_files[i] === file) {
                new_files.splice(i, 1);
            }
        }
        this.setState({
            files: new_files
        });
        this.props.updateCallback('files',this.state.files)
    }
    onRemove(file) {
        var new_files = this.state.files;
        for (var i = 0; i < new_files.length; i++) {
            if (new_files[i] === file) {
                new_files.splice(i, 1);
            }
        }
        this.setState({ files: new_files })
        this.props.updateCallback('files',this.state.files)
    }

    saveDocuments(){
        var fileInputData = {
            "resourceType": "Communication",
            "status": "completed",
            "identifier": [
                {
                    "use": "official"
                }
            ],
            "payload": [],
        }
        if (files != null) {
            for (var i = 0; i < files.length; i++) {
                (function (file) {
                    let content_type = file.type;
                    let file_name = file.name;
                    var reader = new FileReader();
                    reader.onload = function (e) {
                        // get file content  
                        fileInputData.payload.push({
                            "contentAttachment": {
                                "data": reader.result,
                                "contentType": content_type,
                                "title": file_name,
                                "language": "en"
                            }
                        })
                    }
                    reader.readAsBinaryString(file);
                })(files[i])
            }
        }
        console.log("Resource Json before communication--",fileInputData );
        // this.props.saveDocuments(this.props.files,fileInputData)
        return fileInputData;
    }


    render() {
        const files = this.state.files.map(file => (
            <div className='file-block' key={file.name}>
                <a onClick={() => this.onRemove(file)} className="close-thik" />
                {file.name}
            </div>
        ))
        return(
            <div className="margin-top-10px">
                <div className="header">
                    Upload Required/Additional Documentation
                </div>
                <div className="drop-box">
                    <section>
                        <Dropzone
                            onDrop={this.onDrop.bind(this)}
                            onFileDialogCancel={this.onCancel.bind(this)
                            }
                        >
                            {({ getRootProps, getInputProps }) => (
                                <div    >
                                    <div className='drag-drop-box' {...getRootProps()}>
                                        <input {...getInputProps()} />
                                        <div className="file-upload-icon"><FontAwesomeIcon icon={faCloudUploadAlt} /></div>
                                        <div>Drop files here, or click to select files </div>
                                    </div>
                                </div>
                            )}
                        </Dropzone>
                    </section>
                    <div  >{files}</div>
                </div>
            </div>
        )
    }
}

 
