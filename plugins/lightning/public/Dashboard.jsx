import React from 'react';
import ErrorMessage from 'webodm/components/ErrorMessage';
import PropTypes from 'prop-types';
import './Dashboard.scss';
import $ from 'jquery';

export default class Dashboard extends React.Component {
  static defaultProps = {
  };
  static propTypes = {
    apiKey: PropTypes.string.isRequired,
    onLogout: PropTypes.func.isRequired
  }

  constructor(props){
    super(props);

    this.state = {
        error: "",
        loading: true,
        loadingMessage: "",
        user: null,
        nodes: [],
        syncingNodes: false
    }
  }

  apiUrl = url => {
    return `https://webodm.net${url}?api_key=${this.props.apiKey}`;
  };

  componentDidMount = () => {
    this.loadDashboard();
  }

  loadDashboard = () => {
    this.setState({loading: true, loadingMessage: "Loading dashboard..."});

    $.get(this.apiUrl('/r/user')).done(json => {
        if (json.balance !== undefined){
            this.setState({ loading: false, user: json });
            this.handleSyncProcessingNode();
        }else if (json.message === "Unauthorized"){
            this.props.onLogout();
        }else{
            this.setState({ loading: false, error: `Cannot load lightning dashboard. Server responded: ${JSON.stringify(json)}. Are you running the latest version of WebODM?` });
        }
    })
    .fail(() => {
        this.setState({ loading: false, error: `Cannot load lightning dashboard. Please make sure you are connected to the internet, or try again in an hour.`});
    });
  }

  handleSyncProcessingNode = () => {
    if (!this.state.user) return;
    const { node, tokens } = this.state.user;
    if (!node || !tokens) return;

    this.setState({syncingNodes: true, nodes: []});

    $.post('sync_processing_node', {
        hostname: node.hostname,
        port: node.port,
        token: tokens[0].id
    }).done(json => {
        if (json.error){
            this.setState({error: json.error});
        }else{
            this.setState({nodes: json});
        }
    })
    .fail(e => {
        this.setState({error: `Cannot sync nodes: ${JSON.stringify(e)}. Are you connected to the internet?`});
    })
    .always(() => {
        this.setState({syncingNodes: false});
    });
  }

  handeLogout = () => {
    this.setState({loading: true, loadingMessage: "Logging out..."});

    $.post("save_api_key", {
        api_key: ""
    }).done(json => {
      if (!json.success){
          this.setState({error: `Cannot logout: ${JSON.stringify(json)}`});
      }
      this.setState({loading: false});
      this.props.onLogout();
    }).fail(e => {
      this.setState({loading: false, error: `Cannot logout: ${JSON.stringify(e)}`});
    });
  }
  
  handleBuyCredits = () => {
      window.open("https://webodm.net/dashboard?bc=0");
  }

  handleRefresh = () => {
    this.loadDashboard();
  }

  handleOpenDashboard = () => {
      window.open("https://webodm.net/dashboard");
  }

  render(){
    const { loading, loadingMessage, user, syncingNodes, nodes } = this.state;

    return (<div className="lightning-dashboard">
        <ErrorMessage bind={[this, "error"]} />

        { loading ? 
        <div className="text-center loading">{ loadingMessage } <i className="fa fa-spin fa-circle-o-notch"></i></div> :
        <div>
            { user ? 
            <div>
                <div className="balance">
                    Balance: <strong>{ user.balance }</strong> credits 
                    <button className="btn btn-primary btn-sm" onClick={this.handleBuyCredits}><i className="fa fa-shopping-cart"></i> Buy Credits</button>
                    <button className="btn btn-primary btn-sm" onClick={this.handleRefresh}><i className="fa fa-refresh"></i> Refresh Balance</button>
                </div>
                
                <h4>Hello, <a href="javascript:void(0)" onClick={this.handleOpenDashboard}>{ user.email }</a></h4>

                <div className="lightning-nodes">
                    <h5>Synced Nodes</h5>
                    { syncingNodes ? <i className="fa fa-spin fa-refresh"></i> :
                    <div>
                        <ul>
                            {nodes.map(n => 
                                <li key={n.id}><i className="fa fa-laptop"></i> <a href={`/processingnode/${n.id}/`}>{n.label}</a></li>
                            )}
                        </ul>
                        <button className="btn btn-sm btn-default" onClick={this.handleSyncProcessingNode}><i className="fa fa-refresh"></i> Resync</button>
                    </div> }
                </div>

                {nodes.length > 0 ? 
                <div>
                    <hr/>
                    <i className="fa fa-thumbs-o-up"></i> You are all set! When creating a new task from the <a href="/dashboard">Dashboard</a>, select <strong>{nodes[0].label}</strong> from the <strong>Processing Node</strong> drop-down instead of Auto.
                </div> : ""}

                <div className="buttons text-right">
                    <hr/>
                    <button className="btn btn-sm btn-primary logout" onClick={this.handeLogout}>
                        <i className="fa fa-power-off"></i> Logout
                    </button>
                </div>
            </div> : ""}
        </div>}
    </div>);
  }
}