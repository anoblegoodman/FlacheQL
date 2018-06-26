import React, { Component } from 'react';
import Setup from './SetupPopup.jsx';
import Caching from './CachingPopup.jsx';
import Features from './Features.jsx';



class Documentation extends Component {
  constructor(props) {
    super(props);
    this.state = {
      docTopics: ['Setup', 'Caching', 'Features'],
      activeModal: null
    }

    this.clickHandler = this.clickHandler.bind(this);
    this.hideModal = this.hideModal.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
  }

  clickHandler(e, index) {
    this.setState({ activeModal: index });
  }

  hideModal() {
    this.setState({ activeModal: null })
  }

  onKeyDown(e) {
    if (e.keycode === 27) this.hideModal();
  } 

  render () {
    let i = 0;
    let list = this.state.docTopics.map( (topic, index) => {
      return <button className="doc-container" key={i++} onClick={(e) => this.clickHandler(e, index)} onKeyDown={(e) => this.onKeyDown(e)}>{topic}</button>
    });

    return (
    <div className="flex-container">
      {list}

      {this.state.activeModal === 0 ? 
        <Setup isOpen={this.state.activeModal} onClose={this.hideModal}>
            <p>Modal</p>
        </Setup>
        : <div></div>
      }
    
      {this.state.activeModal === 1 ?
        <Caching isOpen={this.state.activeModal} onClose={this.hideModal}>
          <p>Modal</p>
        </Caching>
        : <div></div>
      }

      {this.state.activeModal === 2 ?
        <Features isOpen={this.state.activeModal} onClose={this.hideModal}>
          <p>Modal</p>
        </Features>
        : <div></div>
      }

    </div>
    )
  } 
}

export default Documentation;