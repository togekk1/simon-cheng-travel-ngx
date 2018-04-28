import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { AngularFirestore, AngularFirestoreCollection } from 'angularfire2/firestore';
import { Observable } from 'rxjs/Observable';
import * as firebase from 'firebase/app';
import 'rxjs/add/operator/takeUntil';
import { Subject } from 'rxjs/Subject';
import { tap } from 'rxjs/operators';
import { BgLoadingService } from '../components/bg-loading/bg-loading.service';

@Injectable()
export class DatabaseService implements OnDestroy {
  db: AngularFirestore;
  data_db: any;
  db_org: any;
  private ngUnsubscribe: Subject<any> = new Subject();
  intro_bg_all: any;
  intro_bg: string;
  password: string;
  data: Object;
  new_hide: boolean;
  editorContent_new: string;

  constructor(
    public afDb: AngularFirestore,
    private zone: NgZone,
    private bgLoadingService: BgLoadingService
  ) {


    afDb
      .doc('travel/password')
      .valueChanges()
      .takeUntil(this.ngUnsubscribe)
      .subscribe((res: any) => {
        this.password = res.password;
      });

    this.data_db = afDb.collection('travel/data/australia', ref =>
      ref.orderBy('timestamp')
    );

    this.data = this.data_db.snapshotChanges().map(actions => {
      return actions.map(action => {
        const data = action.payload.doc.data();
        const id = action.payload.doc.id;
        return { id, ...data };
      });
    });
  }

  load_bg() {
    return this.zone.runOutsideAngular(() => {
      return this.afDb
        .doc('travel/background')
        .valueChanges()
        .pipe(
          tap(
            (res: any) => {
              this.bgLoadingService.background = res.background;
              this.intro_bg_all = this.bgLoadingService.background.shift();
              this.bgLoadingService.background.reverse();
              this.intro_bg = 'url(' + this.intro_bg_all.org + ')';
            })
        );
    });
  }

  update_data(content, item, id) {
    this.new_hide = true;
    this.zone.runOutsideAngular(() => {
      if (item !== 'new') {
        const content_new = content['content' + id];
        if (!!content_new) {
          this.data_db
            .doc(item.id)
            .set({ en: content_new, timestamp: item.timestamp })
            .then(res => this.zone.run(() => this.new_hide = false));
        } else {
          this.zone.run(() => this.new_hide = false);
        }
      } else {
        const content_new = content.content_new;
        if (!!content_new && content_new !== '') {
          this.data_db
            .add({ en: content_new, timestamp: new Date() })
            .then(res => {
              this.editorContent_new = null;
              this.zone.run(() => this.new_hide = false);
            });
        } else {
          this.zone.run(() => this.new_hide = false);
        }
      }
    });
  }

  delete_data(item) {
    this.zone.runOutsideAngular(() => {
      this.new_hide = true;
      this.data_db.doc(item.id)
        .delete()
        .then(res => {
          this.zone.run(() => this.new_hide = false);
        });
    });
  }

  ngOnDestroy() {
    this.zone.runOutsideAngular(() => {
      this.ngUnsubscribe.next();
      this.ngUnsubscribe.complete();
    });
  }

}